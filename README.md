# PrintLedger

An open-source, fully **non-custodial** platform for 3D print designers to mint, license, sell, and trade their printable models (STL, OBJ, GLB) as XRPL NFTs.

Provides a familiar "browse → buy → instantly download" experience while adding on-chain provenance, automatic royalties, revocable licenses, and verifiable licensing — all powered by native XRPL features.

## Why PrintLedger?

- Immutable provenance and ownership history
- Automatic royalties via native `TransferFee`
- Revocable licenses via `lsfBurnable` + `NFTokenBurn`
- Fully non-custodial (client-side signing only)
- Low-cost, fast transactions on XRPL mainnet
- Flexible payments with auto-bridging
- AI-agent friendly (public indexer + clear APIs)

## Core Features

### Creators
- Mint models with rich metadata (license terms, tags, print specs)
- Set edition size using `TokenTaxon`
- Configure `TransferFee` (0–50%) for royalties
- Enable `lsfBurnable` flag for revocable licenses
- Bulk minting with Tickets
- One-click "Generate Claim Evidence" package

### Buyers
- Search & browse with interactive 3D previews
- Buy via Sell Offers (optional brokered mode)
- Instant gated download after ledger ownership verification

### Platform
- Optional brokered facilitation fee (0.5–2%, fully transparent and skippable)
- Ownership-gated file serving
- Public read-only indexer for fast discovery
- Primary wallet support: **Xaman** (including Tangem cards via Xaman)

## Tech Stack

- **Frontend**: React 18 + TypeScript + TailwindCSS + shadcn/ui
- **XRPL**: `xrpl.js` v3 (client-side only)
- **3D**: Three.js / `@react-three/fiber` + `@react-three/drei`
- **Storage**: IPFS via Pinata (client-side upload, dev mock included)
- **Wallets**: Primary — Xaman (deep linking + signed payloads)

**No user accounts, no server-side key handling, no custody.**

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- (Optional) [Xaman](https://xumm.app/) wallet on your phone
- (Optional) Pinata account for IPFS uploads

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/kirk3graham/PrintLedger.git
cd PrintLedger

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local — add XRPL node URLs, Pinata keys, etc.

# 4. Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm test` | Run Jest unit tests |
| `npm run test:coverage` | Run tests with coverage report |

## Architecture

```
Frontend (React + xrpl.js)
    ↓
XRPL Mainnet/Testnet (NFTokenMint, Offers, NFTokenBurn, Payments)
    ↓
Read-only Indexer (Clio) → Search + Discovery
    ↓
IPFS/Arweave → Model Files (served only after ownership check)
```

## Project Structure

```
src/
├── __mocks__/          # Jest mocks for Three.js / R3F
├── __tests__/          # Unit tests
├── components/
│   ├── browse/         # NFTCard listing component
│   ├── layout/         # Navbar
│   ├── mint/           # MintForm with full metadata & NFT config
│   ├── ui/             # shadcn-style UI primitives
│   └── wallet/         # Xaman + read-only wallet connection
├── context/
│   └── WalletContext.tsx  # Global wallet state
├── hooks/
│   ├── useXRPL.ts      # XRPL client hook with loading/error state
│   └── useToast.ts     # Toast notifications
├── lib/
│   ├── evidence.ts     # Claim evidence export helpers
│   ├── ipfs.ts         # Pinata upload helpers (with dev mock)
│   ├── utils.ts        # XRP/drops, address utils, metadata URI codec
│   └── xrpl.ts         # Transaction builders + query helpers
├── pages/
│   ├── BrowsePage.tsx  # Browse + search listings
│   ├── MintPage.tsx    # Mint a new model
│   ├── MyNFTsPage.tsx  # Wallet's NFTs
│   └── NFTDetailPage.tsx  # NFT detail + buy/download/burn/evidence
├── types/
│   └── index.ts        # Shared TypeScript interfaces
├── App.tsx             # Router + providers
└── main.tsx            # Entry point
```

## NFT Metadata Schema

Metadata is encoded as a hex-encoded JSON URI stored in the `URI` field of each NFT:

```json
{
  "name": "Articulated Dragon",
  "description": "Print-in-place, no supports needed.",
  "imageUri": "ipfs://<CID>",
  "modelUri": "ipfs://<CID>",
  "licenseTerms": "Personal Use Only",
  "tags": ["dragon", "print-in-place"],
  "printSpecs": {
    "material": "PLA",
    "layerHeight": "0.2mm",
    "infillPercent": 20
  },
  "schemaVersion": "1.0"
}
```

## Testing

```bash
npm test                 # run all unit tests
npm run test:coverage    # with coverage report
```

Tests cover:
- Utility functions (XRP↔drops, address validation, metadata URI codec, etc.)
- XRPL transaction builders (mint, sell offer, accept offer, burn, payment)
- Claim evidence serialization
- `WalletContext` state management
- `ConnectWallet` component (address validation, error states)
- `NFTCard` component (price display, badges, tags)

## CI/CD

GitHub Actions workflow runs on every push to `main`/`develop` and on all pull requests:

1. **Lint & TypeScript type check**
2. **Unit tests** (with coverage artifact)
3. **Production build** (with dist artifact)
4. **Security audit** (`npm audit --audit-level=high`)

## Security & Disclaimers

- This is experimental open-source software. Use at your own risk.
- All transaction construction happens client-side. No private keys are ever sent to a server.
- Always review transactions carefully in Xaman before signing.
- Users are solely responsible for their own tax obligations and IP enforcement.
- PrintLedger only provides public ledger data — it does not investigate or enforce claims.

## Contributing

Contributions are welcome. Priority areas:
- Improving testing coverage for XRPL flows
- Real Xaman SDK integration (Xaman API payload creation)
- Enhancing 3D preview experience (Three.js STL/OBJ/GLB viewer)
- Better metadata schema for 3D printing
- Clio indexer integration for live browse/search

## License

MIT
