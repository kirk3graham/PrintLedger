import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { WalletState, WalletNetwork } from '../types'

interface WalletContextValue extends WalletState {
  connect: (address: string, network: WalletNetwork) => void
  disconnect: () => void
  setNetwork: (network: WalletNetwork) => void
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

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, setNetwork }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider')
  return ctx
}
