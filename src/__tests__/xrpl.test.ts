import {
  buildMintTx,
  buildSellOfferTx,
  buildAcceptOfferTx,
  buildBurnTx,
  buildPaymentTx,
  buildMetadataUri,
  fetchNFTInfo,
  fetchListings,
  fetchNFTHistory,
  NFT_FLAG_BURNABLE,
  NFT_FLAG_TRANSFERABLE,
} from '../lib/xrpl'
import { decodeMetadataUri } from '../lib/utils'
import type { MintParams, NFTMetadata } from '../types'

const MOCK_ADDRESS = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'
const MOCK_NFT_ID = '000800002B19E0B83A8DFD9B9587D4A1E44EF09F1B4D72790000000000000001'

const MOCK_METADATA: NFTMetadata = {
  name: 'Test Model',
  description: 'A test 3D model',
  imageUri: 'ipfs://bafytest',
  modelUri: 'ipfs://bafymodel',
  licenseTerms: 'Personal Use Only',
  tags: ['test'],
  schemaVersion: '1.0',
}

const MOCK_PARAMS: MintParams = {
  metadata: MOCK_METADATA,
  editionSize: 1,
  transferFee: 10000,
  burnable: true,
  quantity: 1,
}

describe('buildMintTx', () => {
  it('builds a valid NFTokenMint transaction', () => {
    const tx = buildMintTx(MOCK_ADDRESS, MOCK_PARAMS)
    expect(tx.TransactionType).toBe('NFTokenMint')
    expect(tx.Account).toBe(MOCK_ADDRESS)
    expect(tx.TransferFee).toBe(10000)
    expect(tx.NFTokenTaxon).toBe(1)
    expect(tx.URI).toBeTruthy()
    expect(typeof tx.URI).toBe('string')
  })

  it('sets burnable flag when burnable=true', () => {
    const tx = buildMintTx(MOCK_ADDRESS, MOCK_PARAMS)
    expect((tx.Flags as number) & NFT_FLAG_BURNABLE).toBe(NFT_FLAG_BURNABLE)
    expect((tx.Flags as number) & NFT_FLAG_TRANSFERABLE).toBe(NFT_FLAG_TRANSFERABLE)
  })

  it('does not set burnable flag when burnable=false', () => {
    const tx = buildMintTx(MOCK_ADDRESS, { ...MOCK_PARAMS, burnable: false })
    expect((tx.Flags as number) & NFT_FLAG_BURNABLE).toBe(0)
    expect((tx.Flags as number) & NFT_FLAG_TRANSFERABLE).toBe(NFT_FLAG_TRANSFERABLE)
  })

  it('includes a PrintLedger memo', () => {
    const tx = buildMintTx(MOCK_ADDRESS, MOCK_PARAMS)
    expect(tx.Memos).toBeDefined()
    expect(tx.Memos!.length).toBeGreaterThan(0)
  })
})

describe('buildMetadataUri', () => {
  it('returns a hex-encoded string', () => {
    const uri = buildMetadataUri(MOCK_METADATA)
    expect(typeof uri).toBe('string')
    expect(uri).toMatch(/^[0-9A-F]+$/)
  })

  it('encodes metadata that can be decoded', () => {
    const uri = buildMetadataUri(MOCK_METADATA)
    const decoded = decodeMetadataUri(uri)
    expect(decoded).toEqual(MOCK_METADATA)
  })
})

describe('buildSellOfferTx', () => {
  it('builds a valid NFTokenCreateOffer transaction', () => {
    const tx = buildSellOfferTx(MOCK_ADDRESS, MOCK_NFT_ID, '5000000')
    expect(tx.TransactionType).toBe('NFTokenCreateOffer')
    expect(tx.Account).toBe(MOCK_ADDRESS)
    expect(tx.NFTokenID).toBe(MOCK_NFT_ID)
    expect(tx.Amount).toBe('5000000')
    expect(tx.Flags).toBe(1)
  })

  it('includes optional destination and expiration', () => {
    const tx = buildSellOfferTx(MOCK_ADDRESS, MOCK_NFT_ID, '5000000', 'rDest123', 1234567890)
    expect(tx.Destination).toBe('rDest123')
    expect(tx.Expiration).toBe(1234567890)
  })
})

describe('buildAcceptOfferTx', () => {
  it('builds a valid NFTokenAcceptOffer transaction', () => {
    const tx = buildAcceptOfferTx(MOCK_ADDRESS, 'OFFER_INDEX_123')
    expect(tx.TransactionType).toBe('NFTokenAcceptOffer')
    expect(tx.Account).toBe(MOCK_ADDRESS)
    expect(tx.NFTokenSellOffer).toBe('OFFER_INDEX_123')
  })

  it('includes broker fee when provided', () => {
    const tx = buildAcceptOfferTx(MOCK_ADDRESS, 'OFFER_INDEX_123', '50000')
    expect(tx.NFTokenBrokerFee).toBe('50000')
  })
})

describe('buildBurnTx', () => {
  it('builds a valid NFTokenBurn transaction', () => {
    const tx = buildBurnTx(MOCK_ADDRESS, MOCK_NFT_ID)
    expect(tx.TransactionType).toBe('NFTokenBurn')
    expect(tx.Account).toBe(MOCK_ADDRESS)
    expect(tx.NFTokenID).toBe(MOCK_NFT_ID)
  })

  it('includes owner when provided (issuer burn)', () => {
    const tx = buildBurnTx(MOCK_ADDRESS, MOCK_NFT_ID, 'rOwner123')
    expect(tx.Owner).toBe('rOwner123')
  })
})

describe('buildPaymentTx', () => {
  it('builds a valid Payment transaction', () => {
    const tx = buildPaymentTx(MOCK_ADDRESS, 'rDest456', '1000000')
    expect(tx.TransactionType).toBe('Payment')
    expect(tx.Account).toBe(MOCK_ADDRESS)
    expect(tx.Destination).toBe('rDest456')
    expect(tx.Amount).toBe('1000000')
  })
})

// ─── Mock client helper ──────────────────────────────────────────────────────

function makeMockClient(requestFn: (req: Record<string, unknown>) => unknown) {
  return {
    request: (req: unknown) => Promise.resolve(requestFn(req as Record<string, unknown>)),
    isConnected: () => true,
  }
}

// ─── fetchNFTInfo ─────────────────────────────────────────────────────────────

describe('fetchNFTInfo', () => {
  it('maps a nft_info response to NFTInfo', async () => {
    const client = makeMockClient(() => ({
      result: {
        nft_id: MOCK_NFT_ID,
        issuer: MOCK_ADDRESS,
        owner: MOCK_ADDRESS,
        uri: '68747470733A2F2F6578616D706C652E636F6D',
        flags: 0x00000009,
        transfer_fee: 5000,
        nft_taxon: 0,
        nft_serial: 1,
        is_burned: false,
      },
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const info = await fetchNFTInfo(client as any, MOCK_NFT_ID)
    expect(info).not.toBeNull()
    expect(info!.nftTokenId).toBe(MOCK_NFT_ID)
    expect(info!.issuer).toBe(MOCK_ADDRESS)
    expect(info!.owner).toBe(MOCK_ADDRESS)
    expect(info!.transferFee).toBe(5000)
    expect(info!.flags).toBe(0x00000009)
    expect(info!.isBurned).toBe(false)
  })

  it('returns null when the server throws', async () => {
    const client = makeMockClient(() => { throw new Error('not found') })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const info = await fetchNFTInfo(client as any, MOCK_NFT_ID)
    expect(info).toBeNull()
  })
})

// ─── fetchListings ────────────────────────────────────────────────────────────

describe('fetchListings', () => {
  it('resolves nfts_by_issuer response into NFTListing[]', async () => {
    const ISSUER = MOCK_ADDRESS
    const URI = buildMetadataUri(MOCK_METADATA)

    const client = makeMockClient((req) => {
      if ((req as Record<string, unknown>).command === 'nfts_by_issuer') {
        return {
          result: {
            nfts: [
              {
                NFTokenID: MOCK_NFT_ID,
                Issuer: ISSUER,
                URI,
                Flags: NFT_FLAG_BURNABLE | NFT_FLAG_TRANSFERABLE,
                NFTokenTaxon: 1,
                nft_serial: 1,
              },
            ],
          },
        }
      }
      // nft_sell_offers — no offers
      return { result: { offers: [] } }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listings = await fetchListings(client as any, ISSUER)
    expect(listings).toHaveLength(1)
    expect(listings[0].nftTokenId).toBe(MOCK_NFT_ID)
    expect(listings[0].issuer).toBe(ISSUER)
    expect(listings[0].metadata?.name).toBe(MOCK_METADATA.name)
    expect(listings[0].burnable).toBe(true)
    expect(listings[0].sellOffers).toEqual([])
  })

  it('falls back to account_nfts when nfts_by_issuer throws', async () => {
    const ISSUER = MOCK_ADDRESS
    const URI = buildMetadataUri(MOCK_METADATA)

    const client = makeMockClient((req) => {
      const cmd = (req as Record<string, unknown>).command
      if (cmd === 'nfts_by_issuer') throw new Error('not supported')
      if (cmd === 'account_nfts') {
        return {
          result: {
            account_nfts: [
              {
                NFTokenID: MOCK_NFT_ID,
                Issuer: ISSUER,
                URI,
                Flags: NFT_FLAG_TRANSFERABLE,
                NFTokenTaxon: 1,
                nft_serial: 1,
              },
            ],
          },
        }
      }
      return { result: { offers: [] } }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listings = await fetchListings(client as any, ISSUER)
    expect(listings).toHaveLength(1)
    expect(listings[0].nftTokenId).toBe(MOCK_NFT_ID)
  })

  it('attaches sell offers to each listing', async () => {
    const ISSUER = MOCK_ADDRESS
    const URI = buildMetadataUri(MOCK_METADATA)

    const client = makeMockClient((req) => {
      const cmd = (req as Record<string, unknown>).command
      if (cmd === 'account_nfts') {
        return {
          result: {
            account_nfts: [
              { NFTokenID: MOCK_NFT_ID, Issuer: ISSUER, URI, Flags: 0x8, NFTokenTaxon: 1, nft_serial: 1 },
            ],
          },
        }
      }
      if (cmd === 'nft_sell_offers') {
        return { result: { offers: [{ index: 'IDX1', amount: '3000000', flags: 1 }] } }
      }
      throw new Error('unexpected')
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listings = await fetchListings(client as any, ISSUER)
    expect(listings[0].sellOffers).toHaveLength(1)
  })
})

// ─── fetchNFTHistory ──────────────────────────────────────────────────────────

describe('fetchNFTHistory', () => {
  it('maps nft_history transactions to TransferRecord[]', async () => {
    const client = makeMockClient(() => ({
      result: {
        transactions: [
          {
            tx: {
              TransactionType: 'NFTokenMint',
              hash: 'TXHASH001',
              Account: MOCK_ADDRESS,
              date: 0,
            },
          },
          {
            tx: {
              TransactionType: 'NFTokenAcceptOffer',
              hash: 'TXHASH002',
              Account: MOCK_ADDRESS,
              Destination: 'rDest123',
              NFTokenSellOffer: 'OFFERIDX',
              date: 1000,
            },
          },
        ],
      },
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = await fetchNFTHistory(client as any, MOCK_NFT_ID)
    expect(records).toHaveLength(2)
    expect(records[0].txHash).toBe('TXHASH001')
    expect(records[1].txHash).toBe('TXHASH002')
    expect(records[1].to).toBe('rDest123')
    expect(records[1].offerIndex).toBe('OFFERIDX')
  })

  it('filters out non-NFT transactions', async () => {
    const client = makeMockClient(() => ({
      result: {
        transactions: [
          { tx: { TransactionType: 'Payment', hash: 'TXPAY', Account: MOCK_ADDRESS, date: 0 } },
          { tx: { TransactionType: 'NFTokenMint', hash: 'TXMINT', Account: MOCK_ADDRESS, date: 0 } },
        ],
      },
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = await fetchNFTHistory(client as any, MOCK_NFT_ID)
    expect(records).toHaveLength(1)
    expect(records[0].txHash).toBe('TXMINT')
  })

  it('returns empty array when nft_history is not supported', async () => {
    const client = makeMockClient(() => { throw new Error('unknown command') })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = await fetchNFTHistory(client as any, MOCK_NFT_ID)
    expect(records).toEqual([])
  })
})
