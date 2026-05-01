/**
 * PrintLedger XRPL Indexer
 *
 * - Subscribes to the XRPL transaction stream and processes every new
 *   NFTokenMint transaction (filtered by WATCH_ISSUERS if configured).
 * - Decodes the URI, fetches metadata from IPFS/Pinata, and upserts the
 *   model into the database.
 * - Provides a `reindexAccount()` helper used by the POST /api/reindex route.
 * - Periodically refreshes sell-offer state.
 */

import { Client, type TransactionStream, type AccountNFToken } from 'xrpl'
import type { InputJsonValue } from '@prisma/client/runtime/library'
import { db } from './db'
import { fetchMetadata } from './metadata'
import { refreshAllOffers, refreshOffersForToken } from './offers'

// ─── Config ───────────────────────────────────────────────────────────────────

const WS_URL = process.env.XRPL_WS_URL ?? 'wss://xrplcluster.com'
const OFFER_REFRESH_INTERVAL_MS = parseInt(
  process.env.OFFER_REFRESH_INTERVAL_MS ?? '300000',
  10,
)

/** Issuers to watch.  Empty set → watch ALL NFTokenMint transactions. */
function getWatchIssuers(): Set<string> {
  const raw = process.env.WATCH_ISSUERS ?? ''
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))
}

// ─── NFT flag constants ───────────────────────────────────────────────────────

const NFT_FLAG_BURNABLE = 0x00000001

// ─── XRPL date helpers ────────────────────────────────────────────────────────

/** Convert an XRPL ledger timestamp (seconds since Ripple epoch) to a JS Date. */
function xrplTimestampToDate(xrplSeconds: number): Date {
  // Ripple epoch = 2000-01-01T00:00:00Z = Unix 946684800
  return new Date((xrplSeconds + 946684800) * 1000)
}

// ─── Process a single minted NFT ─────────────────────────────────────────────

interface NftMintedNode {
  NFToken?: {
    NFTokenID: string
    URI?: string
  }
}

/**
 * Extract the minted NFTokenID and URI from transaction metadata's AffectedNodes.
 */
function extractMintedNft(
  meta: Record<string, unknown>,
): { nfTokenId: string; uri: string } | null {
  const nodes = (meta['AffectedNodes'] as unknown[]) ?? []

  for (const node of nodes) {
    const n = node as Record<string, Record<string, unknown>>
    const inner = n['CreatedNode'] ?? n['ModifiedNode']
    if (!inner || (inner['LedgerEntryType'] as string) !== 'NFTokenPage') continue

    const newFields = (inner['NewFields'] ?? inner['FinalFields']) as
      | Record<string, unknown>
      | undefined
    if (!newFields) continue

    const tokens = (newFields['NFTokens'] as NftMintedNode[]) ?? []
    for (const entry of tokens) {
      const token = entry.NFToken
      if (token?.NFTokenID) {
        return {
          nfTokenId: token.NFTokenID,
          uri: token.URI ?? '',
        }
      }
    }
  }

  return null
}

async function processNftMint(
  client: Client,
  tx: Record<string, unknown>,
  meta: Record<string, unknown>,
): Promise<void> {
  const issuer = tx['Account'] as string
  const tokenTaxon = (tx['NFTokenTaxon'] as number) ?? 0
  const transferFee = (tx['TransferFee'] as number) ?? 0
  const flags = (tx['Flags'] as number) ?? 0
  const isBurnable = (flags & NFT_FLAG_BURNABLE) !== 0
  const date = tx['date'] as number | undefined
  const mintedAt = date ? xrplTimestampToDate(date) : new Date()

  const minted = extractMintedNft(meta)
  if (!minted) {
    console.warn('[indexer] could not extract NFTokenID from mint tx', tx['hash'])
    return
  }

  const { nfTokenId, uri } = minted

  // Idempotency check — skip if already indexed
  const existing = await db.model.findUnique({ where: { nfTokenId }, select: { id: true } })
  if (existing) {
    console.log(`[indexer] already indexed ${nfTokenId}, skipping.`)
    return
  }

  const metadata = await fetchMetadata(uri)

  await db.model.create({
    data: {
      nfTokenId,
      issuer,
      tokenTaxon,
      uri,
      name: metadata?.name ?? '',
      description: metadata?.description ?? '',
      category: metadata?.category ?? '',
      tags: metadata?.tags ?? [],
      licenseType: metadata?.licenseType ?? '',
      transferFee,
      isBurnable,
      previewImage: metadata?.imageUri ?? '',
      fullModelCid: metadata?.modelUri ?? '',
      mintedAt,
      rawMetadata: metadata ? (metadata as unknown as InputJsonValue) : undefined,
    },
  })

  console.log(`[indexer] indexed NFT ${nfTokenId} (${metadata?.name ?? 'unknown'})`)

  // Immediately fetch any active sell offers for the new token
  try {
    await refreshOffersForToken(client, nfTokenId)
  } catch (err) {
    console.warn(`[indexer] could not fetch initial sell offers for ${nfTokenId}:`, err)
  }
}

// ─── Re-index from account_nfts ──────────────────────────────────────────────

/**
 * Re-index all NFTs for a given issuer account.
 * Idempotent — existing records are left unchanged; only missing ones are added.
 */
export async function reindexAccount(client: Client, account: string): Promise<{ indexed: number }> {
  console.log(`[indexer] re-indexing account ${account}…`)

  let marker: unknown = undefined
  let indexed = 0

  do {
    const response = await client.request({
      command: 'account_nfts',
      account,
      limit: 100,
      ...(marker !== undefined ? { marker } : {}),
    })

    const nfts = response.result.account_nfts ?? []
    marker = (response.result as Record<string, unknown>)['marker']

    for (const nft of nfts as AccountNFToken[]) {
      const nfTokenId = nft.NFTokenID
      const uri = nft.URI ?? ''
      const tokenTaxon = nft.NFTokenTaxon
      const transferFee = 0  // TransferFee is not returned by account_nfts; default to 0
      const flags = nft.Flags ?? 0
      const isBurnable = (flags & NFT_FLAG_BURNABLE) !== 0

      const existing = await db.model.findUnique({ where: { nfTokenId }, select: { id: true } })
      if (existing) continue

      const metadata = await fetchMetadata(uri)

      await db.model.create({
        data: {
          nfTokenId,
          issuer: account,
          tokenTaxon,
          uri,
          name: metadata?.name ?? '',
          description: metadata?.description ?? '',
          category: metadata?.category ?? '',
          tags: metadata?.tags ?? [],
          licenseType: metadata?.licenseType ?? '',
          transferFee,
          isBurnable,
          previewImage: metadata?.imageUri ?? '',
          fullModelCid: metadata?.modelUri ?? '',
          mintedAt: new Date(),
          rawMetadata: metadata ? (metadata as unknown as InputJsonValue) : undefined,
        },
      })

      indexed++
      console.log(`[indexer] re-indexed ${nfTokenId}`)

      try {
        await refreshOffersForToken(client, nfTokenId)
      } catch { /* non-fatal */ }
    }
  } while (marker !== undefined)

  console.log(`[indexer] re-index complete for ${account}: ${indexed} new records.`)
  return { indexed }
}

// ─── WebSocket subscription ───────────────────────────────────────────────────

let _client: Client | null = null
let _offerTimer: NodeJS.Timeout | null = null

export function getIndexerClient(): Client | null {
  return _client
}

export async function startIndexer(): Promise<void> {
  const watchIssuers = getWatchIssuers()

  _client = new Client(WS_URL)
  await _client.connect()
  console.log(`[indexer] connected to ${WS_URL}`)

  // Subscribe to the full transaction stream
  await _client.request({
    command: 'subscribe',
    streams: ['transactions'],
  })

  _client.on('transaction', async (event: TransactionStream) => {
    try {
      const tx = event.transaction as unknown as Record<string, unknown>
      if (!tx || tx['TransactionType'] !== 'NFTokenMint') return

      const issuer = tx['Account'] as string | undefined
      if (!issuer) return

      // Filter by configured issuers (if any)
      if (watchIssuers.size > 0 && !watchIssuers.has(issuer)) return

      const meta = event.meta as unknown as Record<string, unknown> | undefined
      if (!meta || meta['TransactionResult'] !== 'tesSUCCESS') return

      await processNftMint(_client!, tx, meta)
    } catch (err) {
      console.error('[indexer] error processing transaction event:', err)
    }
  })

  _client.on('disconnected', () => {
    console.warn('[indexer] disconnected from XRPL, reconnecting…')
    void reconnectWithBackoff()
  })

  // Periodic offer refresh
  _offerTimer = setInterval(() => {
    if (_client?.isConnected()) {
      void refreshAllOffers(_client).catch((err) =>
        console.error('[indexer] periodic offer refresh failed:', err),
      )
    }
  }, OFFER_REFRESH_INTERVAL_MS)

  console.log('[indexer] listening for NFTokenMint transactions…')
}

async function reconnectWithBackoff(attempt = 0): Promise<void> {
  const delay = Math.min(1000 * Math.pow(2, attempt), 30_000)
  await new Promise((r) => setTimeout(r, delay))
  try {
    await startIndexer()
  } catch (err) {
    console.error(`[indexer] reconnect attempt ${attempt + 1} failed:`, err)
    void reconnectWithBackoff(attempt + 1)
  }
}

export async function stopIndexer(): Promise<void> {
  if (_offerTimer) {
    clearInterval(_offerTimer)
    _offerTimer = null
  }
  if (_client?.isConnected()) {
    await _client.disconnect()
    _client = null
  }
}
