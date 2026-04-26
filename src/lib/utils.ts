import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert XRP drops (integer) to a decimal XRP string.
 */
export function dropsToXrp(drops: string | number): string {
  return (Number(drops) / 1_000_000).toFixed(6)
}

/**
 * Convert XRP decimal string to drops (integer string).
 */
export function xrpToDrops(xrp: string | number): string {
  return String(Math.round(Number(xrp) * 1_000_000))
}

/**
 * Truncate an XRPL address for display: rABC...XYZ
 */
export function truncateAddress(address: string, start = 6, end = 4): string {
  if (address.length <= start + end) return address
  return `${address.slice(0, start)}...${address.slice(-end)}`
}

/**
 * Encode arbitrary JSON metadata to a hex URI for NFTokenMint.
 */
export function encodeMetadataUri(metadata: Record<string, unknown>): string {
  const json = JSON.stringify(metadata)
  const bytes = new TextEncoder().encode(json)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/**
 * Decode a hex URI back to a metadata object.
 */
export function decodeMetadataUri(hexUri: string): Record<string, unknown> | null {
  try {
    const bytes = Uint8Array.from(
      (hexUri.match(/.{1,2}/g) ?? []),
      (byte) => parseInt(byte, 16),
    )
    const json = new TextDecoder().decode(bytes)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Build the Xaman deep-link URL for a given JSON payload.
 * Returns a URL string that opens Xaman on mobile to sign the payload.
 * In a real integration this goes through the Xaman SDK/XUMM API;
 * here we use the universal link format for demonstration.
 */
export function buildXamanDeepLink(payloadUuid: string): string {
  return `https://xumm.app/sign/${payloadUuid}`
}

/**
 * Validate that a string is a valid XRPL classic address (starts with 'r', 25-34 chars).
 */
export function isValidXrplAddress(address: string): boolean {
  return /^r[1-9A-HJ-NP-Za-km-z]{24,33}$/.test(address)
}

/**
 * Format a TransferFee value (0-50000 in 1/1000th percent) as a human-readable percentage.
 */
export function formatTransferFee(fee: number): string {
  return `${(fee / 1000).toFixed(1)}%`
}

/**
 * Parse a human-readable percentage (0-50) to a TransferFee integer (0-50000).
 */
export function percentToTransferFee(pct: number): number {
  return Math.round(Math.max(0, Math.min(50, pct)) * 1000)
}
