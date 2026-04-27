import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Download, Flame, ShoppingCart, FileJson, ArrowLeft, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useWallet } from '@/context/WalletContext'
import { useXRPL } from '@/hooks/useXRPL'
import {
  fetchNFTInfo,
  fetchNFTSellOffers,
  fetchNFTHistory,
  verifyOwnership,
  buildAcceptOfferTx,
  buildBurnTx,
  buildClaimEvidence,
  NFT_FLAG_BURNABLE,
} from '@/lib/xrpl'
import { downloadEvidenceFile } from '@/lib/evidence'
import { dropsToXrp, formatTransferFee, buildXamanDeepLink, decodeMetadataUri } from '@/lib/utils'
import type { NFTListing, NFTMetadata, SellOffer, BrokerFeeConfig, TransferRecord } from '@/types'

export function NFTDetailPage() {
  const { tokenId } = useParams<{ tokenId: string }>()
  const { address, connected } = useWallet()
  const { withClient, loading } = useXRPL()

  const [nft, setNft] = useState<NFTListing | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [offers, setOffers] = useState<SellOffer[]>([])
  const [history, setHistory] = useState<TransferRecord[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Broker fee opt-in
  const [brokerConfig, setBrokerConfig] = useState<BrokerFeeConfig>({
    enabled: false,
    bps: 100,
    platformAddress: import.meta.env.VITE_PLATFORM_WALLET_ADDRESS ?? '',
  })

  const loadNFT = useCallback(async () => {
    if (!tokenId) return
    await withClient(async (client) => {
      const info = await fetchNFTInfo(client, tokenId)
      if (!info) return
      const metadata = info.uri ? (decodeMetadataUri(info.uri) as NFTMetadata | null) : null
      const liveOffers = await fetchNFTSellOffers(client, tokenId)
      const liveHistory = await fetchNFTHistory(client, tokenId)
      setNft({
        nftTokenId: info.nftTokenId,
        issuer: info.issuer,
        owner: info.owner,
        metadata,
        transferFee: info.transferFee,
        burnable: (info.flags & NFT_FLAG_BURNABLE) !== 0,
        flags: info.flags,
        sellOffers: liveOffers,
      })
      setOffers(liveOffers)
      setHistory(liveHistory)
    })
  }, [tokenId, withClient])

  const checkOwnership = useCallback(async () => {
    if (!address || !tokenId) return
    await withClient(async (client) => {
      const owned = await verifyOwnership(client, address, tokenId)
      setIsOwner(owned)
    })
  }, [address, tokenId, withClient])

  const refreshOffers = useCallback(async () => {
    if (!tokenId) return
    await withClient(async (client) => {
      const fresh = await fetchNFTSellOffers(client, tokenId)
      setOffers(fresh)
    })
  }, [tokenId, withClient])

  useEffect(() => {
    void loadNFT()
  }, [loadNFT])

  useEffect(() => {
    void checkOwnership()
  }, [checkOwnership])

  // Re-fetch offers independently when wallet connects/changes
  useEffect(() => {
    void refreshOffers()
  }, [refreshOffers])

  const handleBuy = async (offer: SellOffer) => {
    if (!address) { setError('Connect your wallet first.'); return }
    setError(null)
    const brokerFee = brokerConfig.enabled
      ? String(Math.round(Number(offer.amount) * brokerConfig.bps / 10_000))
      : undefined

    const tx = buildAcceptOfferTx(address, offer.offerIndex, brokerFee)
    const payloadUuid = 'buy-' + Date.now()
    const deepLink = buildXamanDeepLink(payloadUuid)
    setStatus(`Open Xaman to complete purchase:\n${deepLink}\n\nTransaction preview:\n${JSON.stringify(tx, null, 2)}`)
    console.info('NFTokenAcceptOffer tx:', tx)
  }

  const handleBurn = async () => {
    if (!address || !nft) { setError('Connect your wallet first.'); return }
    setError(null)
    const tx = buildBurnTx(address, nft.nftTokenId)
    const payloadUuid = 'burn-' + Date.now()
    const deepLink = buildXamanDeepLink(payloadUuid)
    setStatus(`Open Xaman to revoke license:\n${deepLink}`)
    console.info('NFTokenBurn tx:', tx)
  }

  const handleDownload = async () => {
    if (!isOwner) {
      setError('You do not own this NFT. Purchase it to download the model.')
      return
    }
    if (!nft) return
    setStatus(`Ownership verified ✓\nDownloading from: ${nft.metadata?.modelUri ?? 'unknown'}`)
    if (nft.metadata?.modelUri) {
      const url = nft.metadata.modelUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleExportEvidence = async () => {
    if (!address || !nft) { setError('Connect your wallet first.'); return }
    await withClient(async (client) => {
      const evidence = await buildClaimEvidence(
        client,
        address,
        nft.nftTokenId,
        nft.issuer,
        'demo-mint-tx-hash',
      )
      downloadEvidenceFile(evidence)
      setStatus('Claim evidence package downloaded.')
    })
  }

  if (!nft) {
    return (
      <div className="container max-w-4xl py-10 space-y-6">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Browse
        </Link>
        <div className="py-20 text-center text-muted-foreground">
          {loading ? 'Loading NFT…' : 'NFT not found.'}
        </div>
      </div>
    )
  }

  const isBurnable = (nft.flags & NFT_FLAG_BURNABLE) !== 0
  const isIssuer = address === nft.issuer

  return (
    <div className="container max-w-4xl py-10 space-y-6">
      <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Browse
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: preview */}
        <div className="space-y-4">
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
            {nft.metadata?.imageUri ? (
              <img
                src={nft.metadata.imageUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}
                alt={nft.metadata.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-muted-foreground text-sm">No preview available</div>
            )}
          </div>

          {/* Print specs */}
          {nft.metadata?.printSpecs && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Print Specs</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {nft.metadata.printSpecs.material && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Material</span>
                    <span>{nft.metadata.printSpecs.material}</span>
                  </div>
                )}
                {nft.metadata.printSpecs.layerHeight && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Layer Height</span>
                    <span>{nft.metadata.printSpecs.layerHeight}</span>
                  </div>
                )}
                {nft.metadata.printSpecs.infillPercent !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Infill</span>
                    <span>{nft.metadata.printSpecs.infillPercent}%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: details + actions */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{nft.metadata?.name ?? 'Unknown'}</h1>
            {nft.metadata?.description && (
              <p className="mt-2 text-muted-foreground">{nft.metadata.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {nft.metadata?.tags?.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
            {isBurnable && (
              <Badge variant="outline" className="text-orange-500 border-orange-300">
                <Flame className="h-3 w-3 mr-1" /> Revocable License
              </Badge>
            )}
          </div>

          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Royalty</span>
              <span>{formatTransferFee(nft.transferFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">License</span>
              <span>{nft.metadata?.licenseTerms}</span>
            </div>
          </div>

          {/* Ownership indicator */}
          {connected && (
            <div className={`flex items-center gap-2 text-sm ${isOwner ? 'text-green-600' : 'text-muted-foreground'}`}>
              {isOwner && <CheckCircle className="h-4 w-4" />}
              {isOwner ? 'You own this NFT' : 'You do not own this NFT'}
            </div>
          )}

          {/* Buy offers */}
          {offers.length > 0 && !isOwner && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Purchase</CardTitle>
                <CardDescription>Buy this NFT to access the model file.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Broker fee toggle */}
                <div className="flex items-center justify-between text-sm">
                  <div className="space-y-0.5">
                    <Label htmlFor="broker-toggle">Platform facilitation fee (1%)</Label>
                    <p className="text-xs text-muted-foreground">Optional, fully transparent</p>
                  </div>
                  <Switch
                    id="broker-toggle"
                    checked={brokerConfig.enabled}
                    onCheckedChange={(v) => setBrokerConfig((c) => ({ ...c, enabled: v }))}
                  />
                </div>

                {offers.map((offer) => (
                  <div key={offer.offerIndex} className="flex items-center justify-between">
                    <span className="font-semibold">
                      {dropsToXrp(offer.amount as string)} XRP
                    </span>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => handleBuy(offer)}
                      disabled={loading}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Buy
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Owner actions */}
          {isOwner && (
            <div className="flex flex-col gap-2">
              <Button className="gap-2" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Download Model
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExportEvidence}>
                <FileJson className="h-4 w-4" />
                Export Claim Evidence
              </Button>
            </div>
          )}

          {/* Issuer burn */}
          {isIssuer && isBurnable && (
            <Button variant="destructive" className="w-full gap-2" onClick={handleBurn}>
              <Flame className="h-4 w-4" />
              Revoke License (Burn NFT)
            </Button>
          )}
        </div>
      </div>

      {/* Status / error */}
      {status && (
        <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap font-mono">
          {status}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Transaction history */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {history.map((record) => (
              <div key={record.txHash} className="flex items-start justify-between gap-2 border-b pb-2 last:border-0 last:pb-0">
                <div className="space-y-0.5 min-w-0">
                  <div className="font-mono text-xs truncate text-muted-foreground">{record.txHash}</div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">From </span>
                    <span className="font-mono">{record.from.slice(0, 8)}…</span>
                    {record.to && (
                      <>
                        <span className="text-muted-foreground"> → </span>
                        <span className="font-mono">{record.to.slice(0, 8)}…</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(record.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
