import { ExternalLink, Tag, Flame } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { NFTListing } from '@/types'
import { dropsToXrp, formatTransferFee, truncateAddress } from '@/lib/utils'
import { NFT_FLAG_BURNABLE } from '@/lib/xrpl'

interface NFTCardProps {
  listing: NFTListing
}

export function NFTCard({ listing }: NFTCardProps) {
  const { nftTokenId, metadata, transferFee, flags, owner, sellOffers } = listing
  const isBurnable = (flags & NFT_FLAG_BURNABLE) !== 0
  const lowestOffer = sellOffers.length > 0
    ? sellOffers.reduce((a, b) =>
        Number(a.amount) < Number(b.amount) ? a : b,
      )
    : null

  return (
    <Card className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      {/* Preview image */}
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {metadata?.imageUri ? (
          <img
            src={metadata.imageUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}
            alt={metadata.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-muted-foreground text-xs">No preview</div>
        )}
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-base line-clamp-1">
          {metadata?.name ?? 'Unknown Model'}
        </CardTitle>
        <p className="text-xs text-muted-foreground font-mono">
          {truncateAddress(owner)}
        </p>
      </CardHeader>

      <CardContent className="pb-2 flex-1 space-y-2">
        {metadata?.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{metadata.description}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {metadata?.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              <Tag className="h-2.5 w-2.5 mr-1" />
              {tag}
            </Badge>
          ))}
          {isBurnable && (
            <Badge variant="outline" className="text-xs text-orange-500 border-orange-300">
              <Flame className="h-2.5 w-2.5 mr-1" />
              Revocable
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Royalty: {formatTransferFee(transferFee)}
        </div>
      </CardContent>

      <CardFooter className="pt-2 flex items-center justify-between gap-2">
        {lowestOffer ? (
          <span className="font-semibold text-sm">
            {dropsToXrp(lowestOffer.amount as string)} XRP
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Not listed</span>
        )}
        <Link to={`/nft/${nftTokenId}`}>
          <Button size="sm" variant="outline" className="gap-1">
            <ExternalLink className="h-3.5 w-3.5" />
            View
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
