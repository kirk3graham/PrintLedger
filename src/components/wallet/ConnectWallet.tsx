import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, Smartphone, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useWallet } from '@/context/WalletContext'
import { isValidXrplAddress } from '@/lib/utils'

/**
 * ConnectWallet — supports two modes:
 * 1. Xaman: opens deep-link / QR for mobile signing (non-custodial)
 * 2. Read-only: enter an address to browse without signing
 */
export function ConnectWallet() {
  const { connect, network } = useWallet()
  const navigate = useNavigate()

  const [readOnlyAddress, setReadOnlyAddress] = useState('')
  const [addressError, setAddressError] = useState('')

  // In a real Xaman integration this would call the Xaman API to create a
  // Sign-In payload and open the returned deep-link.  For the MVP we
  // demonstrate the deep-link pattern and fall back to manual entry.
  const handleXamanConnect = () => {
    const xamanSignInUrl =
      'https://xaman.app/sign/sign-in'
    window.open(xamanSignInUrl, '_blank', 'noopener,noreferrer')
  }

  const handleReadOnlyConnect = () => {
    if (!isValidXrplAddress(readOnlyAddress)) {
      setAddressError('Please enter a valid XRPL address (starts with r).')
      return
    }
    setAddressError('')
    connect(readOnlyAddress, network)
    navigate('/')
  }

  return (
    <div className="container max-w-lg py-16 flex flex-col gap-6">
      <div className="text-center space-y-2">
        <Wallet className="mx-auto h-12 w-12 text-primary" />
        <h1 className="text-3xl font-bold">Connect your wallet</h1>
        <p className="text-muted-foreground">
          Non-custodial — your keys never leave your device.
        </p>
      </div>

      {/* Xaman */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Xaman (Recommended)
          </CardTitle>
          <CardDescription>
            Sign transactions securely with Xaman on your phone, including Tangem hardware cards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full gap-2" onClick={handleXamanConnect}>
            <ExternalLink className="h-4 w-4" />
            Open Xaman to sign in
          </Button>
          <p className="mt-3 text-xs text-muted-foreground text-center">
            After signing in Xaman, paste your address below.
          </p>
        </CardContent>
      </Card>

      {/* Read-only / address entry */}
      <Card>
        <CardHeader>
          <CardTitle>Enter address manually</CardTitle>
          <CardDescription>
            Browse and verify ownership without signing. Minting and buying will require Xaman.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">XRPL Address</Label>
            <Input
              id="address"
              placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              value={readOnlyAddress}
              onChange={(e) => {
                setReadOnlyAddress(e.target.value)
                setAddressError('')
              }}
            />
            {addressError && (
              <p className="text-sm text-destructive">{addressError}</p>
            )}
          </div>
          <Button variant="outline" className="w-full" onClick={handleReadOnlyConnect}>
            Continue in read-only mode
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
