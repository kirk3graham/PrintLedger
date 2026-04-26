import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NFTCard } from '@/components/browse/NFTCard'
import { useWallet } from '@/context/WalletContext'
import { useXRPL } from '@/hooks/useXRPL'
import { fetchAccountNFTs, fetchNFTSellOffers } from '@/lib/xrpl'
import { decodeMetadataUri } from '@/lib/utils'
import type { NFTListing, NFTMetadata } from '@/types'
import type { AccountNFToken } from 'xrpl'

export function MyNFTsPage() {
  const { address, connected } = useWallet()
  const { withClient, loading } = useXRPL()
  const [listings, setListings] = useState<NFTListing[]>([])

  const loadMyNFTs = useCallback(async () => {
    if (!address) return
    await withClient(async (client) => {
      const rawNFTs = await fetchAccountNFTs(client, address)
      const resolved: NFTListing[] = await Promise.all(
        rawNFTs.map(async (nft: AccountNFToken) => {
          const uriHex = nft.URI ?? ''
          const metadata = uriHex ? (decodeMetadataUri(uriHex) as NFTMetadata | null) : null
          const offers = await fetchNFTSellOffers(client, nft.NFTokenID)
          return {
            nftTokenId: nft.NFTokenID,
            issuer: nft.Issuer,
            owner: address,
            metadata,
            transferFee: 0,
            burnable: false,
            flags: nft.Flags,
            sellOffers: offers,
          }
        }),
      )
      setListings(resolved)
    })
  }, [address, withClient])

  useEffect(() => {
    void loadMyNFTs()
  }, [loadMyNFTs])

  if (!connected) {
    return (
      <div className="container py-20 flex flex-col items-center gap-4 text-center">
        <Wallet className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Connect your wallet</h2>
        <p className="text-muted-foreground">Connect to see your NFTs and manage your listings.</p>
        <Link to="/connect">
          <Button>Connect Wallet</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My NFTs</h1>
        <p className="text-muted-foreground mt-1">Your minted and purchased model licenses.</p>
      </div>

      {loading && listings.length === 0 && (
        <div className="py-20 text-center text-muted-foreground">Loading your NFTs…</div>
      )}

      {!loading && listings.length === 0 && (
        <div className="py-20 text-center text-muted-foreground space-y-4">
          <p>You don't have any NFTs yet.</p>
          <Link to="/mint">
            <Button>Mint your first model</Button>
          </Link>
        </div>
      )}

      {listings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <NFTCard key={listing.nftTokenId} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}
