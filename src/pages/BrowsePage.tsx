import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { NFTCard } from '@/components/browse/NFTCard'
import { useXRPL } from '@/hooks/useXRPL'
import { fetchListings } from '@/lib/xrpl'
import type { NFTListing } from '@/types'

const PLATFORM_ISSUER = import.meta.env.VITE_PLATFORM_ISSUER_ADDRESS as string | undefined

export function BrowsePage() {
  const { withClient, loading } = useXRPL()
  const [listings, setListings] = useState<NFTListing[]>([])
  const [query, setQuery] = useState('')

  const filtered = listings.filter((l) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      l.metadata?.name.toLowerCase().includes(q) ||
      l.metadata?.description?.toLowerCase().includes(q) ||
      l.metadata?.tags?.some((t) => t.toLowerCase().includes(q))
    )
  })

  const refreshListings = useCallback(async () => {
    if (!PLATFORM_ISSUER) return
    await withClient(async (client) => {
      const live = await fetchListings(client, PLATFORM_ISSUER)
      setListings(live)
    })
  }, [withClient])

  useEffect(() => {
    void refreshListings()
  }, [refreshListings])

  return (
    <div className="container py-10 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Browse Models</h1>
          <p className="text-muted-foreground mt-1">Discover and license 3D print designs on XRPL.</p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshListings} disabled={loading || !PLATFORM_ISSUER} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search models, tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Grid */}
      {!PLATFORM_ISSUER ? (
        <div className="py-20 text-center text-muted-foreground">
          Set <code className="font-mono">VITE_PLATFORM_ISSUER_ADDRESS</code> to load live listings.
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          {loading ? 'Loading listings…' : 'No models found.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((listing) => (
            <NFTCard key={listing.nftTokenId} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}
