import { Client, NFTokenMint, NFTokenCreateOffer, NFTokenAcceptOffer, NFTokenBurn, Payment, convertStringToHex } from 'xrpl'
import type { NFTMetadata, MintParams, SellOffer, ClaimEvidence, TransferRecord } from '../types'
import { encodeMetadataUri } from './utils'

// ─── Client Singleton ────────────────────────────────────────────────────────

let _client: Client | null = null

export async function getClient(wsUrl: string): Promise<Client> {
  if (_client && _client.isConnected()) return _client
  _client = new Client(wsUrl)
  await _client.connect()
  return _client
}

export async function disconnectClient(): Promise<void> {
  if (_client && _client.isConnected()) {
    await _client.disconnect()
    _client = null
  }
}

// ─── NFT Flag constants ───────────────────────────────────────────────────────

export const NFT_FLAG_BURNABLE = 0x00000001
export const NFT_FLAG_ONLY_XRP = 0x00000002
export const NFT_FLAG_TRUSTLINE = 0x00000004
export const NFT_FLAG_TRANSFERABLE = 0x00000008

// ─── Metadata URI ─────────────────────────────────────────────────────────────

export function buildMetadataUri(metadata: NFTMetadata): string {
  return encodeMetadataUri(metadata as unknown as Record<string, unknown>)
}

// ─── Mint ─────────────────────────────────────────────────────────────────────

export function buildMintTx(
  account: string,
  params: MintParams,
): NFTokenMint {
  const flags = params.burnable ? NFT_FLAG_BURNABLE | NFT_FLAG_TRANSFERABLE : NFT_FLAG_TRANSFERABLE
  const uriHex = buildMetadataUri(params.metadata)

  return {
    TransactionType: 'NFTokenMint',
    Account: account,
    NFTokenTaxon: params.editionSize,
    TransferFee: params.transferFee,
    Flags: flags,
    URI: uriHex,
    Memos: [
      {
        Memo: {
          MemoData: convertStringToHex('PrintLedger v1'),
        },
      },
    ],
  }
}

// ─── Sell Offer ───────────────────────────────────────────────────────────────

export function buildSellOfferTx(
  account: string,
  nftTokenId: string,
  amountDrops: string,
  destination?: string,
  expiration?: number,
): NFTokenCreateOffer {
  const tx: NFTokenCreateOffer = {
    TransactionType: 'NFTokenCreateOffer',
    Account: account,
    NFTokenID: nftTokenId,
    Amount: amountDrops,
    Flags: 1, // tfSellNFToken
  }
  if (destination) tx.Destination = destination
  if (expiration) tx.Expiration = expiration
  return tx
}

// ─── Accept Offer ─────────────────────────────────────────────────────────────

export function buildAcceptOfferTx(
  account: string,
  sellOfferIndex: string,
  brokerFeeDrops?: string,
): NFTokenAcceptOffer {
  const tx: NFTokenAcceptOffer = {
    TransactionType: 'NFTokenAcceptOffer',
    Account: account,
    NFTokenSellOffer: sellOfferIndex,
  }
  if (brokerFeeDrops) {
    tx.NFTokenBrokerFee = brokerFeeDrops
  }
  return tx
}

// ─── Burn ─────────────────────────────────────────────────────────────────────

export function buildBurnTx(account: string, nftTokenId: string, owner?: string): NFTokenBurn {
  const tx: NFTokenBurn = {
    TransactionType: 'NFTokenBurn',
    Account: account,
    NFTokenID: nftTokenId,
  }
  if (owner) tx.Owner = owner
  return tx
}

// ─── XRP Transfer (for direct payment) ───────────────────────────────────────

export function buildPaymentTx(
  account: string,
  destination: string,
  amountDrops: string,
): Payment {
  return {
    TransactionType: 'Payment',
    Account: account,
    Destination: destination,
    Amount: amountDrops,
  }
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export async function fetchAccountNFTs(client: Client, account: string) {
  const response = await client.request({
    command: 'account_nfts',
    account,
  })
  return response.result.account_nfts ?? []
}

export async function fetchNFTSellOffers(client: Client, nftTokenId: string): Promise<SellOffer[]> {
  try {
    const response = await client.request({
      command: 'nft_sell_offers',
      nft_id: nftTokenId,
    })
    return (response.result.offers ?? []) as unknown as SellOffer[]
  } catch {
    return []
  }
}

export async function verifyOwnership(client: Client, account: string, nftTokenId: string): Promise<boolean> {
  const nfts = await fetchAccountNFTs(client, account)
  return nfts.some((nft: { NFTokenID: string }) => nft.NFTokenID === nftTokenId)
}

export async function fetchTransactionHistory(
  client: Client,
  account: string,
  nftTokenId: string,
): Promise<TransferRecord[]> {
  const response = await client.request({
    command: 'account_tx',
    account,
    limit: 200,
  })

  const records: TransferRecord[] = []
  const transactions = response.result.transactions ?? []

  for (const entry of transactions) {
    const tx = entry.tx as unknown as Record<string, unknown>
    if (!tx) continue
    const type = tx['TransactionType'] as string
    if (type === 'NFTokenMint' || type === 'NFTokenAcceptOffer') {
      const affectedNft = (tx['NFTokenID'] as string | undefined) ??
        extractNftIdFromMeta(entry.meta as unknown as Record<string, unknown>, nftTokenId)
      if (affectedNft !== nftTokenId) continue

      records.push({
        txHash: tx['hash'] as string ?? '',
        from: tx['Account'] as string ?? '',
        to: (tx['Destination'] as string | undefined) ?? '',
        timestamp: new Date((tx['date'] as number ?? 0) * 1000 + 946684800000).toISOString(),
        offerIndex: tx['NFTokenSellOffer'] as string | undefined,
      })
    }
  }
  return records
}

function extractNftIdFromMeta(
  meta: Record<string, unknown> | undefined,
  nftTokenId: string,
): string | undefined {
  if (!meta) return undefined
  const nodes = (meta['AffectedNodes'] as unknown[]) ?? []
  for (const node of nodes) {
    const n = node as Record<string, Record<string, unknown>>
    const inner = n['CreatedNode'] ?? n['ModifiedNode'] ?? n['DeletedNode']
    if (!inner) continue
    if ((inner['LedgerEntryType'] as string) === 'NFTokenPage') {
      const final = (inner['FinalFields'] ?? inner['NewFields']) as Record<string, unknown> | undefined
      if (!final) continue
      const tokens = (final['NFTokens'] as Array<{ NFToken: { NFTokenID: string } }>) ?? []
      if (tokens.some((t) => t.NFToken.NFTokenID === nftTokenId)) return nftTokenId
    }
  }
  return undefined
}

export async function buildClaimEvidence(
  client: Client,
  account: string,
  nftTokenId: string,
  issuer: string,
  mintTxHash: string,
): Promise<ClaimEvidence> {
  const history = await fetchTransactionHistory(client, issuer, nftTokenId)
  return {
    nftTokenId,
    ownerAddress: account,
    issuedBy: issuer,
    mintTxHash,
    transferHistory: history,
    exportedAt: new Date().toISOString(),
  }
}
