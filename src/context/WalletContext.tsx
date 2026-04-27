import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { WalletState, WalletNetwork } from '../types'
import { xamanSignIn, createXamanPayload } from '../lib/xaman'
import type { XamanPayloadInfo, XamanPayloadResult } from '../lib/xaman'

interface WalletContextValue extends WalletState {
  connect: (address: string, network: WalletNetwork) => void
  disconnect: () => void
  setNetwork: (network: WalletNetwork) => void
  /**
   * Sign in with Xaman via the official SDK (PKCE OAuth2 flow).
   * Opens a popup / redirect; resolves when the user completes sign-in.
   * Automatically calls connect() with the returned XRPL address.
   */
  connectWithXaman: () => Promise<void>
  /**
   * Create a Xaman signing payload for an XRPL transaction.
   * Returns QR-code URL and deep-link for display in the UI.
   * Calls onResolved when the user signs or rejects the payload.
   */
  createPayload: (
    tx: Record<string, unknown>,
    onResolved: (result: XamanPayloadResult) => void,
  ) => Promise<XamanPayloadInfo>
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    network: 'testnet',
    connected: false,
  })

  const connect = useCallback((address: string, network: WalletNetwork) => {
    setState({ address, network, connected: true })
  }, [])

  const disconnect = useCallback(() => {
    setState((prev) => ({ address: null, network: prev.network, connected: false }))
  }, [])

  const setNetwork = useCallback((network: WalletNetwork) => {
    setState((prev) => ({ ...prev, network }))
  }, [])

  const connectWithXaman = useCallback(async (): Promise<void> => {
    const result = await xamanSignIn()
    setState((prev) => ({ address: result.account, network: prev.network, connected: true }))
  }, [])

  const createPayload = useCallback(
    (
      tx: Record<string, unknown>,
      onResolved: (result: XamanPayloadResult) => void,
    ): Promise<XamanPayloadInfo> => createXamanPayload(tx, onResolved),
    [],
  )

  return (
    <WalletContext.Provider
      value={{ ...state, connect, disconnect, setNetwork, connectWithXaman, createPayload }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider')
  return ctx
}
