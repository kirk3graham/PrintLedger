import { useState } from 'react'
import { Upload, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useWallet } from '@/context/WalletContext'
import { buildMintTx } from '@/lib/xrpl'
import { uploadFileToPinata } from '@/lib/ipfs'
import { percentToTransferFee, formatTransferFee } from '@/lib/utils'
import { XamanSigningModal, type SigningStatus } from '@/components/wallet/XamanSigningModal'
import type { XamanPayloadInfo } from '@/lib/xaman'
import type { MintParams, NFTMetadata } from '@/types'

export function MintForm() {
  const { address, connected, createPayload } = useWallet()

  // Metadata fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [licenseTerms, setLicenseTerms] = useState('Personal Use Only')
  const [tags, setTags] = useState('')
  const [material, setMaterial] = useState('')
  const [layerHeight, setLayerHeight] = useState('')
  const [infillPercent, setInfillPercent] = useState<number | ''>('')

  // Mint config
  const [transferFeePct, setTransferFeePct] = useState(10) // 10%
  const [burnable, setBurnable] = useState(true)
  const [editionSize, setEditionSize] = useState(1)
  const [quantity, setQuantity] = useState(1)
  const [sellPrice, setSellPrice] = useState('')

  // File uploads
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Xaman signing modal state
  const [signingPayload, setSigningPayload] = useState<XamanPayloadInfo | null>(null)
  const [signingStatus, setSigningStatus] = useState<SigningStatus>('pending')
  const [signingTxid, setSigningTxid] = useState<string | undefined>()
  const [modalOpen, setModalOpen] = useState(false)

  const handleMint = async () => {
    if (!connected || !address) {
      setError('Please connect your wallet first.')
      return
    }
    if (!name.trim()) {
      setError('Model name is required.')
      return
    }
    if (!modelFile) {
      setError('Please upload a model file (STL, OBJ, or GLB).')
      return
    }

    setLoading(true)
    setError(null)

    try {
      setSigningPayload(null)
      setSigningStatus('pending')
      setSigningTxid(undefined)

      const modelCid = await uploadFileToPinata(modelFile)
      let imageCid = ''
      if (imageFile) {
        imageCid = await uploadFileToPinata(imageFile)
      }

      const metadata: NFTMetadata = {
        name,
        description,
        imageUri: imageCid ? `ipfs://${imageCid}` : '',
        modelUri: `ipfs://${modelCid}`,
        licenseTerms,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        printSpecs: {
          material: material || undefined,
          layerHeight: layerHeight || undefined,
          infillPercent: infillPercent !== '' ? Number(infillPercent) : undefined,
        },
        schemaVersion: '1.0',
      }

      const params: MintParams = {
        metadata,
        editionSize,
        transferFee: percentToTransferFee(transferFeePct),
        burnable,
        sellPriceDrops: sellPrice ? String(Math.round(Number(sellPrice) * 1_000_000)) : undefined,
        quantity,
      }

      const tx = buildMintTx(address, params)
      console.info('NFTokenMint tx:', JSON.stringify(tx, null, 2))

      // Open the signing modal immediately (shows spinner while payload loads)
      setModalOpen(true)

      const payload = await createPayload(tx, (result) => {
        if (result.signed) {
          setSigningStatus('signed')
          setSigningTxid(result.txid)
        } else {
          setSigningStatus('rejected')
        }
      })
      setSigningPayload(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setModalOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-2xl py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mint a Model</h1>
        <p className="text-muted-foreground mt-1">
          Upload your 3D model, set license terms, and mint an NFT on XRPL.
        </p>
      </div>

      {/* Model info */}
      <Card>
        <CardHeader>
          <CardTitle>Model Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Awesome Model" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your model, print settings, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseTerms">License Terms</Label>
            <Input
              id="licenseTerms"
              value={licenseTerms}
              onChange={(e) => setLicenseTerms(e.target.value)}
              placeholder="Personal Use Only"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="miniature, scifi, functional"
            />
          </div>
        </CardContent>
      </Card>

      {/* Print specs */}
      <Card>
        <CardHeader>
          <CardTitle>Print Specifications</CardTitle>
          <CardDescription>Optional — helps buyers know how to print your model.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Input id="material" value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="PLA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="layerHeight">Layer Height</Label>
              <Input
                id="layerHeight"
                value={layerHeight}
                onChange={(e) => setLayerHeight(e.target.value)}
                placeholder="0.2mm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="infill">Infill %</Label>
            <Input
              id="infill"
              type="number"
              min={0}
              max={100}
              value={infillPercent}
              onChange={(e) => setInfillPercent(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Files */}
      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
          <CardDescription>Model file will be gated behind ownership verification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="modelFile">Model File * (STL, OBJ, GLB)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="modelFile"
                type="file"
                accept=".stl,.obj,.glb"
                onChange={(e) => setModelFile(e.target.files?.[0] ?? null)}
              />
              <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
            {modelFile && (
              <p className="text-xs text-muted-foreground">Selected: {modelFile.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="imageFile">Preview Image (PNG, JPG, WEBP)</Label>
            <Input
              id="imageFile"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </CardContent>
      </Card>

      {/* NFT config */}
      <Card>
        <CardHeader>
          <CardTitle>NFT Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Transfer fee */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Royalty (TransferFee)</Label>
              <Badge variant="secondary">{formatTransferFee(percentToTransferFee(transferFeePct))}</Badge>
            </div>
            <Slider
              min={0}
              max={50}
              step={0.5}
              value={[transferFeePct]}
              onValueChange={([v]) => setTransferFeePct(v)}
            />
            <p className="text-xs text-muted-foreground">
              Applied automatically on every secondary sale. 0–50%.
            </p>
          </div>

          {/* Burnable */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Revocable License (lsfBurnable)</Label>
              <p className="text-xs text-muted-foreground">
                Allows you (the issuer) to burn this NFT and revoke the license.
              </p>
            </div>
            <Switch checked={burnable} onCheckedChange={setBurnable} />
          </div>

          {/* Edition size */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="editionSize">Edition Size (TokenTaxon)</Label>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <Input
              id="editionSize"
              type="number"
              min={1}
              value={editionSize}
              onChange={(e) => setEditionSize(Math.max(1, Number(e.target.value)))}
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to mint</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(100, Number(e.target.value))))}
            />
            {quantity > 1 && (
              <p className="text-xs text-muted-foreground">
                Quantities &gt;1 will use Tickets for bulk minting.
              </p>
            )}
          </div>

          {/* Sell price */}
          <div className="space-y-2">
            <Label htmlFor="sellPrice">List price (XRP, optional)</Label>
            <Input
              id="sellPrice"
              type="number"
              min={0}
              step={0.000001}
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              placeholder="10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={handleMint}
        disabled={loading || !connected}
      >
        {loading ? 'Processing…' : 'Mint NFT'}
      </Button>

      {!connected && (
        <p className="text-center text-sm text-muted-foreground">
          Connect your wallet to mint.
        </p>
      )}

      <XamanSigningModal
        open={modalOpen}
        payload={signingPayload}
        status={signingStatus}
        txid={signingTxid}
        title="Sign Mint Transaction"
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
