import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { NFTCard } from '@/components/browse/NFTCard'
import { useXRPL } from '@/hooks/useXRPL'
import { fetchNFTSellOffers } from '@/lib/xrpl'
import type { NFTListing } from '@/types'

// Placeholder — in production this would call the Clio indexer REST endpoint.
const DEMO_LISTINGS: NFTListing[] = [
  {
    nftTokenId: '000800002B19E0B83A8DFD9B9587D4A1E44EF09F1B4D72790000000000000001',
    issuer: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    owner: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    metadata: {
      name: 'Articulated Dragon',
      description: 'Print-in-place articulated dragon, no supports needed.',
      imageUri: '',
      modelUri: 'ipfs://bafybeimockdragon',
      licenseTerms: 'Personal Use Only',
      tags: ['dragon', 'print-in-place', 'fun'],
      printSpecs: { material: 'PLA', layerHeight: '0.2mm', infillPercent: 20 },
      schemaVersion: '1.0',
    },
    transferFee: 10000, // 10%
    burnable: true,
    flags: 0x00000001 | 0x00000008,
    sellOffers: [
      {
        offerIndex: 'AABB1122',
        amount: '5000000', // 5 XRP
        flags: 1,
      },
    ],
  },
  {
    nftTokenId: '000800002B19E0B83A8DFD9B9587D4A1E44EF09F1B4D72790000000000000002',
    issuer: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
    owner: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
    metadata: {
      name: 'Mechanical Iris Box',
      description: 'Fully functional mechanical iris lid. Great conversation piece.',
      imageUri: '',
      modelUri: 'ipfs://bafybeimockiris',
      licenseTerms: 'Personal + Commercial OK',
      tags: ['mechanical', 'box', 'functional'],
      printSpecs: { material: 'PETG', layerHeight: '0.15mm', infillPercent: 40 },
      schemaVersion: '1.0',
    },
    transferFee: 5000, // 5%
    burnable: false,
    flags: 0x00000008,
    sellOffers: [
      {
        offerIndex: 'CCDD3344',
        amount: '12000000', // 12 XRP
        flags: 1,
      },
    ],
  },
  {
    nftTokenId: '000800002B19E0B83A8DFD9B9587D4A1E44EF09F1B4D72790000000000000003',
    issuer: 'rN7n3473SaZBCG4dFL83w7PB6RBc6Zzyx3',
    owner: 'rN7n3473SaZBCG4dFL83w7PB6RBc6Zzyx3',
    metadata: {
      name: 'Voronoi Vase',
      description: 'Elegant voronoi pattern vase, single-wall vase mode recommended.',
      imageUri: '',
      modelUri: 'ipfs://bafybeimockvase',
      licenseTerms: 'Personal Use Only',
      tags: ['vase', 'voronoi', 'decorative'],
      printSpecs: { material: 'PLA Silk', layerHeight: '0.2mm', infillPercent: 0 },
      schemaVersion: '1.0',
    },
    transferFee: 0,
    burnable: false,
    flags: 0x00000008,
    sellOffers: [],
  },
]

export function BrowsePage() {
  const { withClient, loading } = useXRPL()
  const [listings, setListings] = useState<NFTListing[]>(DEMO_LISTINGS)
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
    // In production: fetch from Clio indexer.
    // For now we fetch sell offers for demo listings.
    await withClient(async (client) => {
      const updated = await Promise.all(
        DEMO_LISTINGS.map(async (listing) => {
          const offers = await fetchNFTSellOffers(client, listing.nftTokenId)
          return { ...listing, sellOffers: offers }
        }),
      )
      setListings(updated)
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
        <Button variant="outline" size="sm" onClick={refreshListings} disabled={loading} className="gap-2">
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
      {filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">No models found.</div>
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
