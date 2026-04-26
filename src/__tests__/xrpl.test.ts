import {
  buildMintTx,
  buildSellOfferTx,
  buildAcceptOfferTx,
  buildBurnTx,
  buildPaymentTx,
  buildMetadataUri,
  NFT_FLAG_BURNABLE,
  NFT_FLAG_TRANSFERABLE,
} from '../lib/xrpl'
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { decodeMetadataUri } = require('../lib/utils')
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
