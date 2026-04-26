import { Link, useLocation } from 'react-router-dom'
import { Layers, Wallet, LogOut, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useWallet } from '@/context/WalletContext'
import { truncateAddress } from '@/lib/utils'

export function Navbar() {
  const { address, connected, network, disconnect, setNetwork } = useWallet()
  const location = useLocation()

  const navLinks = [
    { to: '/', label: 'Browse' },
    { to: '/mint', label: 'Mint' },
    { to: '/my-nfts', label: 'My NFTs' },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Layers className="h-6 w-6 text-primary" />
          <span>PrintLedger</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`transition-colors hover:text-foreground/80 ${
                location.pathname === to ? 'text-foreground font-medium' : 'text-foreground/60'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Wallet + network */}
        <div className="flex items-center gap-2">
          {/* Network toggle */}
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex gap-1"
            onClick={() => setNetwork(network === 'mainnet' ? 'testnet' : 'mainnet')}
          >
            <Globe className="h-3.5 w-3.5" />
            <Badge variant={network === 'mainnet' ? 'default' : 'secondary'} className="text-xs">
              {network}
            </Badge>
          </Button>

          {connected && address ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-mono">
                {truncateAddress(address)}
              </span>
              <Button variant="ghost" size="icon" onClick={disconnect} title="Disconnect wallet">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Link to="/connect">
              <Button size="sm" className="gap-2">
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
