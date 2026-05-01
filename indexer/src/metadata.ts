/**
 * IPFS / Pinata metadata fetching with retry logic.
 *
 * The NFT URI field on XRPL is hex-encoded.  It may contain:
 *   1.  An IPFS URI  (e.g. "ipfs://QmXXX" or "ipfs://bafy…")
 *   2.  A bare CID   (e.g. "QmXXX" or "bafy…")
 *   3.  An HTTP(S) URL already pointing at the gateway
 *   4.  The full JSON blob encoded directly (legacy / non-Pinata mints)
 *
 * In cases 1-3 we fetch from the configured Pinata gateway.
 * In case 4 we parse the JSON directly.
 */

export interface NFTIndexedMetadata {
  name: string
  description: string
  imageUri: string
  modelUri: string
  licenseType: string
  category: string
  tags: string[]
  printSpecs?: Record<string, unknown>
  schemaVersion?: string
  [key: string]: unknown
}

const PINATA_GATEWAY = process.env.PINATA_GATEWAY ?? 'https://gateway.pinata.cloud/ipfs'
const MAX_RETRIES = parseInt(process.env.METADATA_MAX_RETRIES ?? '3', 10)
const RETRY_DELAY_MS = parseInt(process.env.METADATA_RETRY_DELAY_MS ?? '2000', 10)

// ─── URI helpers ─────────────────────────────────────────────────────────────

/** Decode a hex-encoded URI string back to its original UTF-8 value. */
function hexToUtf8(hex: string): string {
  const bytes = Uint8Array.from(
    (hex.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16)),
  )
  return new TextDecoder().decode(bytes)
}

/** Return true if the string looks like a bare IPFS CID (CIDv0 or CIDv1). */
function looksLikeCid(str: string): boolean {
  // CIDv0: "Qm" + exactly 44 base-58 characters (total 46 chars)
  // CIDv1: starts with "baf" followed by base32 characters (common Pinata format)
  return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(str) || /^baf[a-z2-7]{50,}$/.test(str)
}

/**
 * Resolve a (possibly hex-encoded) NFT URI to a fetch-able HTTP URL, or
 * return null if the URI already contains the full JSON.
 */
export function resolveMetadataUrl(rawHexUri: string): { url: string | null; inlineJson: string | null } {
  let decoded: string
  try {
    decoded = hexToUtf8(rawHexUri)
  } catch {
    // If hex decode fails, treat the value as a plain string
    decoded = rawHexUri
  }

  // Case 4 — inline JSON blob
  if (decoded.trimStart().startsWith('{')) {
    return { url: null, inlineJson: decoded }
  }

  // Case 1 — ipfs:// URI
  if (decoded.startsWith('ipfs://')) {
    const cid = decoded.slice('ipfs://'.length)
    return { url: `${PINATA_GATEWAY}/${cid}`, inlineJson: null }
  }

  // Case 3 — http(s) URL
  if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
    return { url: decoded, inlineJson: null }
  }

  // Case 2 — bare CID
  if (looksLikeCid(decoded)) {
    return { url: `${PINATA_GATEWAY}/${decoded}`, inlineJson: null }
  }

  // Unknown format — try fetching as a URL anyway
  return { url: decoded, inlineJson: null }
}

// ─── Fetch with retry ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<unknown> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`)
      }
      return await response.json()
    } catch (err) {
      lastError = err
      if (attempt < retries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt) // exponential back-off
        console.warn(`[metadata] fetch attempt ${attempt + 1} failed for ${url}, retrying in ${delay}ms:`, err)
        await sleep(delay)
      }
    }
  }
  throw lastError
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch and parse NFT metadata given the raw hex URI from the XRPL NFT.
 *
 * Returns null when the metadata cannot be retrieved (error is logged).
 */
export async function fetchMetadata(rawHexUri: string): Promise<NFTIndexedMetadata | null> {
  const { url, inlineJson } = resolveMetadataUrl(rawHexUri)

  try {
    let raw: unknown
    if (inlineJson) {
      raw = JSON.parse(inlineJson)
    } else if (url) {
      raw = await fetchWithRetry(url)
    } else {
      console.warn('[metadata] could not resolve URI to a fetch-able location')
      return null
    }

    return normalise(raw)
  } catch (err) {
    console.error(`[metadata] failed to fetch/parse metadata for URI "${rawHexUri}":`, err)
    return null
  }
}

/** Normalise raw metadata JSON into the expected shape. */
function normalise(raw: unknown): NFTIndexedMetadata {
  const obj = (raw ?? {}) as Record<string, unknown>
  return {
    name: String(obj['name'] ?? ''),
    description: String(obj['description'] ?? ''),
    imageUri: String(obj['imageUri'] ?? obj['image'] ?? ''),
    modelUri: String(obj['modelUri'] ?? obj['animation_url'] ?? ''),
    licenseType: String(obj['licenseType'] ?? obj['licenseTerms'] ?? ''),
    category: String(obj['category'] ?? ''),
    tags: Array.isArray(obj['tags']) ? (obj['tags'] as string[]).map(String) : [],
    printSpecs: (obj['printSpecs'] as Record<string, unknown> | undefined) ?? undefined,
    schemaVersion: obj['schemaVersion'] ? String(obj['schemaVersion']) : undefined,
    ...obj,
  }
}
