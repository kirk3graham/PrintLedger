import { Xumm } from 'xumm'

let _instance: Xumm | null = null

/**
 * Returns the Xumm SDK singleton, or null when VITE_XAMAN_API_KEY is not set.
 * The singleton is lazy-initialised on the first call.
 */
export function getXamanSdk(): Xumm | null {
  const apiKey = import.meta.env.VITE_XAMAN_API_KEY as string | undefined
  if (!apiKey) return null
  if (!_instance) {
    _instance = new Xumm(apiKey)
  }
  return _instance
}

/** Reset the singleton — used in tests. */
export function _resetXamanSdk(): void {
  _instance = null
}

// ─── Sign-in ─────────────────────────────────────────────────────────────────

export interface XamanSignInResult {
  /** Signed-in XRPL classic address. */
  account: string
}

/**
 * Initiates a Xaman sign-in via PKCE OAuth2.
 * Opens a popup / redirect handled by the SDK; resolves with the XRPL account.
 *
 * Throws if the API key is not configured, the popup is cancelled, or no
 * account is returned.
 */
export async function xamanSignIn(): Promise<XamanSignInResult> {
  const xumm = getXamanSdk()
  if (!xumm) {
    throw new Error(
      'Xaman API key not configured. Set VITE_XAMAN_API_KEY in your .env file.',
    )
  }

  const result = await xumm.authorize()
  if (!result || result instanceof Error) {
    throw new Error('Xaman sign-in was cancelled or failed.')
  }
  if (!result.me?.account) {
    throw new Error('No XRPL account returned from Xaman sign-in.')
  }
  return { account: result.me.account }
}

// ─── Transaction payload ──────────────────────────────────────────────────────

export interface XamanPayloadInfo {
  /** Xaman payload UUID. */
  uuid: string
  /** URL of the QR-code PNG to display. */
  qrUrl: string
  /** Deep-link / redirect URL to open Xaman on mobile. */
  redirectUrl: string
}

export interface XamanPayloadResult {
  signed: boolean
  /** On-ledger transaction hash (available when signed is true). */
  txid?: string
  /** Signer account address (available when signed is true). */
  account?: string
}

/** Shape of the data object returned by a Xaman signing subscription event. */
interface XamanSignedData {
  signed?: boolean
  txid?: string | null
  account?: string | null
}

/**
 * Creates a Xaman signing payload for the given XRPL transaction object.
 *
 * Returns QR-code URL and deep-link for display in the UI.
 * Calls `onResolved` when the user signs or rejects the payload.
 *
 * Requires `xumm.payload` to be ready (i.e. the user is authenticated via
 * `xamanSignIn()` first, or `VITE_XAMAN_API_KEY` is set and the SDK is
 * initialised).
 */
export async function createXamanPayload(
  tx: object,
  onResolved: (result: XamanPayloadResult) => void,
): Promise<XamanPayloadInfo> {
  const xumm = getXamanSdk()
  if (!xumm?.payload) {
    throw new Error(
      'Xaman SDK not available. Sign in with Xaman or set VITE_XAMAN_API_KEY.',
    )
  }

  const subscription = await xumm.payload.createAndSubscribe(
    { txjson: tx } as Parameters<typeof xumm.payload.createAndSubscribe>[0],
    (event) => {
      // Returning a non-undefined value resolves the `subscription.resolved`
      // promise and unsubscribes the WebSocket listener.
      if ('signed' in event.data) {
        return event.data
      }
    },
  )

  const { created, resolved } = subscription
  if (!created) throw new Error('Failed to create Xaman payload.')

  resolved
    ?.then((data) => {
      const d = data as XamanSignedData | null
      if (d && typeof d.signed === 'boolean') {
        onResolved({
          signed: d.signed,
          txid: d.txid ?? undefined,
          account: d.account ?? undefined,
        })
      } else {
        onResolved({ signed: false })
      }
    })
    .catch(() => onResolved({ signed: false }))

  return {
    uuid: created.uuid,
    qrUrl: created.refs.qr_png,
    redirectUrl: created.next.always,
  }
}
