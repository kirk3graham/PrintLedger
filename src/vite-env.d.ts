/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_XRPL_TESTNET_URL: string
  readonly VITE_XRPL_MAINNET_URL: string
  readonly VITE_PLATFORM_WALLET_ADDRESS: string
  readonly VITE_PINATA_API_KEY: string
  readonly VITE_PINATA_SECRET_KEY: string
  readonly VITE_PLATFORM_FEE_BPS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
