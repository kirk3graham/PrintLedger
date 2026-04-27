import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, Smartphone, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useWallet } from '@/context/WalletContext'
import { isValidXrplAddress } from '@/lib/utils'

/**
 * ConnectWallet — supports two modes:
 * 1. Xaman: signs in via the official Xaman SDK (PKCE OAuth2 flow)
 * 2. Read-only: enter an address to browse without signing
 */
export function ConnectWallet() {
  const { connect, network, connectWithXaman } = useWallet()
  const navigate = useNavigate()

  const [readOnlyAddress, setReadOnlyAddress] = useState('')
  const [addressError, setAddressError] = useState('')
  const [xamanLoading, setXamanLoading] = useState(false)
  const [xamanError, setXamanError] = useState<string | null>(null)

  const handleXamanConnect = async () => {
    setXamanLoading(true)
    setXamanError(null)
    try {
      await connectWithXaman()
      navigate('/')
    } catch (err) {
      setXamanError(err instanceof Error ? err.message : 'Xaman sign-in failed.')
    } finally {
      setXamanLoading(false)
    }
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
          <Button
            className="w-full gap-2"
            onClick={handleXamanConnect}
            disabled={xamanLoading}
          >
            {xamanLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for Xaman…
              </>
            ) : (
              <>
                <Smartphone className="h-4 w-4" />
                Sign in with Xaman
              </>
            )}
          </Button>
          {xamanError && (
            <p className="mt-2 text-xs text-destructive">{xamanError}</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground text-center">
            A popup will open — scan the QR code in Xaman to sign in.
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
