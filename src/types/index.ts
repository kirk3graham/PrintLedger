// ─── XRPL / NFT Types ───────────────────────────────────────────────────────

export interface NFTMetadata {
  /** Human-readable model name */
  name: string
  /** Short description */
  description: string
  /** IPFS/Arweave CID of the preview image */
  imageUri: string
  /** IPFS/Arweave CID of the model file (STL, OBJ, or GLB) */
  modelUri: string
  /** License terms (e.g. "Personal Use Only", "Commercial OK") */
  licenseTerms: string
  /** Print specifications: material, layer height, etc. */
  printSpecs?: PrintSpecs
  /** Searchable tags */
  tags?: string[]
  /** Schema version for forward compatibility */
  schemaVersion: '1.0'
}

export interface PrintSpecs {
  material?: string
  layerHeight?: string
  supportsRequired?: boolean
  infillPercent?: number
  filamentEstimateGrams?: number
}

export interface MintParams {
  metadata: NFTMetadata
  /** Edition size — encoded into TokenTaxon */
  editionSize: number
  /** Royalty fee in basis-points × 10 (0–50 000).  50% = 50 000 */
  transferFee: number
  /** Allow creator to burn (revoke) the token */
  burnable: boolean
  /** Sell price in drops (0 = list later) */
  sellPriceDrops?: string
  /** Number of editions to bulk-mint (uses Tickets when > 1) */
  quantity: number
}

export interface NFTListing {
  nftTokenId: string
  issuer: string
  owner: string
  metadata: NFTMetadata | null
  transferFee: number
  burnable: boolean
  sellOffers: SellOffer[]
  /** Resolved from flags */
  flags: number
}

export interface SellOffer {
  offerIndex: string
  amount: string | IssuedCurrencyAmount
  destination?: string
  expiration?: number
  flags: number
}

export interface IssuedCurrencyAmount {
  currency: string
  issuer: string
  value: string
}

// ─── Wallet ─────────────────────────────────────────────────────────────────

export type WalletNetwork = 'mainnet' | 'testnet'

export interface WalletState {
  address: string | null
  network: WalletNetwork
  connected: boolean
}

// ─── Platform ────────────────────────────────────────────────────────────────

export interface BrokerFeeConfig {
  /** Enabled by user (opt-in) */
  enabled: boolean
  /** Basis points (50 = 0.5%, 200 = 2%) */
  bps: number
  /** Recipient of platform fee */
  platformAddress: string
}

// ─── Evidence Export ─────────────────────────────────────────────────────────

export interface ClaimEvidence {
  nftTokenId: string
  ownerAddress: string
  issuedBy: string
  mintTxHash: string
  transferHistory: TransferRecord[]
  exportedAt: string
}

export interface TransferRecord {
  txHash: string
  from: string
  to: string
  timestamp: string
  offerIndex?: string
}
