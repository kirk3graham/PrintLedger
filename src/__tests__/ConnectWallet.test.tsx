import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ConnectWallet } from '../components/wallet/ConnectWallet'
import { WalletProvider } from '../context/WalletContext'

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
