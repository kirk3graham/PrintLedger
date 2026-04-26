/**
 * Client-side IPFS upload helpers.
 * Uses the Pinata API when credentials are available,
 * otherwise falls back to a mock for local development.
 */

const PINATA_API = 'https://api.pinata.cloud'

export interface PinataConfig {
  apiKey: string
  secretKey: string
}

function getPinataConfig(): PinataConfig | null {
  const apiKey = import.meta.env.VITE_PINATA_API_KEY
  const secretKey = import.meta.env.VITE_PINATA_SECRET_KEY
  if (!apiKey || !secretKey) return null
  return { apiKey, secretKey }
}

/**
 * Upload a File to IPFS via Pinata.
 * Returns the IPFS CID (without ipfs:// prefix).
 */
export async function uploadFileToPinata(file: File): Promise<string> {
  const config = getPinataConfig()
  if (!config) {
    // Dev mock — return a deterministic fake CID
    return `bafybeimock${encodeURIComponent(file.name).replace(/[^a-z0-9]/gi, '').slice(0, 20).toLowerCase()}`
  }

  const form = new FormData()
  form.append('file', file)
  form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

  const response = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: {
      pinata_api_key: config.apiKey,
      pinata_secret_api_key: config.secretKey,
    },
    body: form,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Pinata upload failed: ${text}`)
  }

  const data = (await response.json()) as { IpfsHash: string }
  return data.IpfsHash
}

/**
 * Upload a JSON metadata object to IPFS via Pinata.
 * Returns the IPFS CID.
 */
export async function uploadJsonToPinata(json: Record<string, unknown>, name: string): Promise<string> {
  const config = getPinataConfig()
  if (!config) {
    return `bafybeimockjson${encodeURIComponent(name).replace(/[^a-z0-9]/gi, '').slice(0, 16).toLowerCase()}`
  }

  const response = await fetch(`${PINATA_API}/pinning/pinJSONToIPFS`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      pinata_api_key: config.apiKey,
      pinata_secret_api_key: config.secretKey,
    },
    body: JSON.stringify({
      pinataOptions: { cidVersion: 1 },
      pinataMetadata: { name },
      pinataContent: json,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Pinata JSON upload failed: ${text}`)
  }

  const data = (await response.json()) as { IpfsHash: string }
  return data.IpfsHash
}

/**
 * Build a public gateway URL for an IPFS CID.
 */
export function ipfsGatewayUrl(cid: string, gateway = 'https://gateway.pinata.cloud/ipfs'): string {
  return `${gateway}/${cid}`
}
