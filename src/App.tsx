import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WalletProvider } from './context/WalletContext'
import { Navbar } from './components/layout/Navbar'
import { BrowsePage } from './pages/BrowsePage'
import { MintPage } from './pages/MintPage'
import { MyNFTsPage } from './pages/MyNFTsPage'
import { NFTDetailPage } from './pages/NFTDetailPage'
import { ConnectWallet } from './components/wallet/ConnectWallet'

function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<BrowsePage />} />
              <Route path="/mint" element={<MintPage />} />
              <Route path="/my-nfts" element={<MyNFTsPage />} />
              <Route path="/nft/:tokenId" element={<NFTDetailPage />} />
              <Route path="/connect" element={<ConnectWallet />} />
            </Routes>
          </main>
          <footer className="border-t py-6 text-center text-xs text-muted-foreground">
            <p>
              PrintLedger is experimental open-source software. Use at your own risk.{' '}
              <a
                href="https://github.com/kirk3graham/PrintLedger"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </p>
          </footer>
        </div>
      </BrowserRouter>
    </WalletProvider>
  )
}

export default App
