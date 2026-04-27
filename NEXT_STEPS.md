# PrintLedger — Next Steps

Ordered by impact and implementation readiness. Each section links to the relevant code areas.

---

## 1. Xaman SDK Integration (High Priority)

The current wallet flow builds a Xaman deep-link URL and opens it in a new tab. Replace this with the official [Xaman SDK](https://github.com/XRPL-Labs/Xumm-Universal-SDK) to get real payload callbacks and signed transaction results.

**Files to update:**
- `src/lib/utils.ts` — `buildXamanDeepLink()` → SDK `xaman.payload.create()`
- `src/context/WalletContext.tsx` — subscribe to sign-in events from the SDK
- `src/components/wallet/ConnectWallet.tsx` — show QR code / redirect modal returned by the SDK

**Why:** Without callback confirmation, the app cannot verify whether the user actually signed the transaction. Every buy, mint, and burn action is currently fire-and-forget from the app's perspective.

---

## 2. Live XRPL Data via Clio Indexer (High Priority)

`BrowsePage` and `NFTDetailPage` currently show hard-coded demo listings. Wire them up to a real [Clio](https://github.com/XRPLF/clio) or `xrpl.js` query.

**Queries needed:**
- `nfts_by_issuer` / `account_nfts` — populate the browse grid
- `nft_sell_offers` — display real lowest-price offers on each card
- `nft_history` — populate the transaction timeline on the detail page

**Files to update:**
- `src/lib/xrpl.ts` — add `fetchListings()`, `fetchSellOffers()` (stubs already exist for single-NFT queries)
- `src/pages/BrowsePage.tsx` — replace `DEMO_LISTINGS` with live data
- `src/pages/NFTDetailPage.tsx` — replace stubbed offer with live `nft_sell_offers` result

---

## 3. Ownership-Gated File Serving (High Priority)

Downloads are currently client-side only — the model URI is visible in the NFT metadata hex anyone can decode. A gated download requires a small server-side component.

**Recommended flow:**
1. User requests download → app sends their XRPL address + NFT ID to an edge function.
2. Edge function calls `account_nfts` to verify ownership on-ledger.
3. On success, return a short-lived signed URL to the IPFS/S3 asset.

**Files to add/update:**
- `api/download.ts` (new) — Vercel/Cloudflare Edge function
- `src/pages/NFTDetailPage.tsx` — call the edge function instead of opening `modelUri` directly

---

## 4. Real IPFS Uploads (Medium Priority)

`src/lib/ipfs.ts` has a `VITE_PINATA_JWT` environment variable path but falls back to a deterministic dev mock in all non-production builds. Wire up the real Pinata v2 API.

**Checklist:**
- [ ] Add `VITE_PINATA_JWT` to production environment secrets
- [ ] Replace mock CID logic with `pinata.pinFileToIPFS()` calls in `uploadFileToPinata()`
- [ ] Upload both the model file and the thumbnail image, then build `NFTMetadata` with real CIDs
- [ ] Consider an [nft.storage](https://nft.storage/) fallback for redundancy

---

## 5. Bulk Minting with XRPL Tickets (Medium Priority)

`MintForm` exposes a `quantity` field that feeds into `buildMintTx`, but multi-quantity minting is not yet implemented end-to-end.

**Steps:**
1. Pre-create N `Ticket` objects with a single `TicketCreate` transaction.
2. Fire N `NFTokenMint` transactions referencing each Ticket sequence.
3. Collect the resulting `NFTokenID`s from transaction metadata.

**Files to update:**
- `src/lib/xrpl.ts` — add `buildTicketCreateTx()` and update `buildMintTx()` to accept `TicketSequence`
- `src/components/mint/MintForm.tsx` — orchestrate the two-step flow and surface progress to the user

---

## 6. NFT Search & Tag Filtering (Medium Priority)

`BrowsePage` has a search bar and tag chips wired to local state but the filter is applied only over the in-memory demo array. Improve this once live data is in place.

**Improvements:**
- Pass `tag` and `name` filters as query params to the Clio call (if the indexer supports it) or apply client-side filtering with memoisation.
- Add URL-based filter state (`?q=dragon&tag=print-in-place`) so links are shareable.

---

## 7. MyNFTs Page (Medium Priority)

`src/pages/MyNFTsPage.tsx` exists but is not fully implemented. It should:
- Call `account_nfts` for the connected wallet address.
- Allow the owner to create a Sell Offer directly from their collection.
- Show pending/open offers and let the owner cancel them (`NFTokenCancelOffer`).

---

## 8. Expanded Test Coverage (Ongoing)

Current coverage is 41 tests focused on utility functions and simple components. Priority gaps:

| Area | What to test |
|------|-------------|
| `MintForm` | File upload → metadata build → `buildMintTx` call |
| `NFTDetailPage` | Buy flow, broker fee toggle, burn confirmation dialog |
| `BrowsePage` | Search input debounce, tag filter, empty state |
| `ipfs.ts` | Pinata upload success/failure paths |
| `evidence.ts` | File download trigger, JSON structure |

---

## 9. Broker Fee Transparency UI (Low Priority)

The broker fee opt-in switch exists on `NFTDetailPage`. Add a small breakdown tooltip showing:
- Base price
- Broker fee amount (e.g. 1%)
- Creator royalty amount (from `TransferFee`)
- Total cost to buyer

---

## 10. Metadata Schema v2 (Low Priority)

The current `NFTMetadata` schema (`src/types/index.ts`) covers the basics. Additions to consider for v2:

```ts
interface NFTMetadata {
  // ... existing fields ...
  printSpecs: {
    filamentType: string        // PLA | PETG | ABS | Resin
    layerHeight: string
    infillPercent: number
    supportRequired: boolean    // new
    estimatedPrintTime: string  // new, e.g. "4h 30m"
    printerProfile?: string     // new, e.g. "Bambu Lab X1"
  }
  previewImages: string[]       // new, multiple angles
  licenseType: 'personal' | 'commercial' | 'cc0' | 'custom'  // new enum
}
```

Bump `schemaVersion` to `"2.0"` and add a migration helper in `src/lib/utils.ts`.
