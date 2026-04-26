import { useState, useCallback } from 'react'
import { useWallet } from '../context/WalletContext'
import { getClient } from '../lib/xrpl'
import type { Client } from 'xrpl'

const XRPL_URLS: Record<string, string> = {
  mainnet: import.meta.env.VITE_XRPL_MAINNET_URL ?? 'wss://xrplcluster.com',
  testnet: import.meta.env.VITE_XRPL_TESTNET_URL ?? 'wss://s.altnet.rippletest.net:51233',
}

export function useXRPL() {
  const { network } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const withClient = useCallback(
    async <T>(fn: (client: Client) => Promise<T>): Promise<T | null> => {
      setLoading(true)
      setError(null)
      try {
        const client = await getClient(XRPL_URLS[network])
        return await fn(client)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        return null
      } finally {
        setLoading(false)
      }
    },
    [network],
  )

  return { withClient, loading, error, setError }
}
