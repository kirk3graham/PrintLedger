import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ConnectWallet } from '../components/wallet/ConnectWallet'
import { WalletProvider } from '../context/WalletContext'

// Mock the xaman lib so sign-in doesn't need a real API key or SDK
jest.mock('../lib/xaman', () => ({
  getXamanSdk: jest.fn(() => ({})),
  xamanSignIn: jest.fn().mockResolvedValue({ account: 'rMockXamanAddress1234567890123456' }),
  createXamanPayload: jest.fn().mockResolvedValue({
    uuid: 'mock-uuid',
    qrUrl: 'https://xumm.app/sign/mock-uuid_q.png',
    redirectUrl: 'https://xumm.app/sign/mock-uuid',
  }),
}))

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <MemoryRouter>{children}</MemoryRouter>
    </WalletProvider>
  )
}

describe('ConnectWallet', () => {
  it('renders wallet connection options', () => {
    render(<ConnectWallet />, { wrapper: Wrapper })
    expect(screen.getByText('Connect your wallet')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Xaman/i })).toBeInTheDocument()
    expect(screen.getByText(/read-only/i)).toBeInTheDocument()
  })

  it('shows the Sign in with Xaman button', () => {
    render(<ConnectWallet />, { wrapper: Wrapper })
    expect(screen.getByRole('button', { name: /Sign in with Xaman/i })).toBeInTheDocument()
  })

  it('shows loading state while Xaman sign-in is in progress', async () => {
    const { xamanSignIn } = jest.requireMock('../lib/xaman') as {
      xamanSignIn: jest.Mock
    }
    // Make sign-in hang indefinitely so we can observe loading state
    let resolveSignIn: (v: { account: string }) => void = () => {}
    xamanSignIn.mockImplementationOnce(
      () => new Promise<{ account: string }>((res) => { resolveSignIn = res }),
    )

    const user = userEvent.setup()
    render(<ConnectWallet />, { wrapper: Wrapper })

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Sign in with Xaman/i }))
    })

    expect(screen.getByText(/Waiting for Xaman/i)).toBeInTheDocument()

    // Clean up: resolve the hanging promise
    await act(async () => { resolveSignIn({ account: 'rMockXamanAddress1234567890123456' }) })
  })

  it('shows error when Xaman sign-in fails', async () => {
    const { xamanSignIn } = jest.requireMock('../lib/xaman') as {
      xamanSignIn: jest.Mock
    }
    xamanSignIn.mockRejectedValueOnce(new Error('Xaman API key not configured.'))

    const user = userEvent.setup()
    render(<ConnectWallet />, { wrapper: Wrapper })

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Sign in with Xaman/i }))
    })

    expect(screen.getByText(/Xaman API key not configured/i)).toBeInTheDocument()
  })

  it('shows error for invalid XRPL address', async () => {
    const user = userEvent.setup()
    render(<ConnectWallet />, { wrapper: Wrapper })
    const input = screen.getByPlaceholderText(/rXXX/i)
    await act(async () => {
      await user.type(input, 'invalid-address')
      await user.click(screen.getByText('Continue in read-only mode'))
    })
    expect(screen.getByText(/valid XRPL address/i)).toBeInTheDocument()
  })

  it('accepts a valid XRPL address', async () => {
    const user = userEvent.setup()
    render(<ConnectWallet />, { wrapper: Wrapper })
    const input = screen.getByPlaceholderText(/rXXX/i)
    await act(async () => {
      await user.type(input, 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh')
      await user.click(screen.getByText('Continue in read-only mode'))
    })
    expect(screen.queryByText(/valid XRPL address/i)).not.toBeInTheDocument()
  })
})
