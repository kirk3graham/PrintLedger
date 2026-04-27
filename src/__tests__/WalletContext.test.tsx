import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WalletProvider, useWallet } from '../context/WalletContext'

// Mock xaman lib so tests don't need a real API key
jest.mock('../lib/xaman', () => ({
  xamanSignIn: jest.fn().mockResolvedValue({ account: 'rXamanAddress123456789012345678' }),
  createXamanPayload: jest.fn().mockResolvedValue({
    uuid: 'mock-uuid',
    qrUrl: 'https://xumm.app/sign/mock-uuid_q.png',
    redirectUrl: 'https://xumm.app/sign/mock-uuid',
  }),
}))

function TestConsumer() {
  const { address, connected, network, connect, disconnect, setNetwork, connectWithXaman, createPayload } = useWallet()
  return (
    <div>
      <div data-testid="connected">{String(connected)}</div>
      <div data-testid="address">{address ?? 'none'}</div>
      <div data-testid="network">{network}</div>
      <button onClick={() => connect('rTestAddress123456789012345678', 'mainnet')}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
      <button onClick={() => setNetwork('mainnet')}>Set Mainnet</button>
      <button onClick={() => void connectWithXaman()}>Xaman Connect</button>
      <button
        onClick={() =>
          void createPayload({ TransactionType: 'SignIn' }, () => {})
        }
      >
        Create Payload
      </button>
    </div>
  )
}

describe('WalletContext', () => {
  it('starts disconnected', () => {
    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>,
    )
    expect(screen.getByTestId('connected').textContent).toBe('false')
    expect(screen.getByTestId('address').textContent).toBe('none')
    expect(screen.getByTestId('network').textContent).toBe('testnet')
  })

  it('connects with address and network', async () => {
    const user = userEvent.setup()
    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>,
    )
    await act(async () => {
      await user.click(screen.getByText('Connect'))
    })
    expect(screen.getByTestId('connected').textContent).toBe('true')
    expect(screen.getByTestId('address').textContent).toBe('rTestAddress123456789012345678')
    expect(screen.getByTestId('network').textContent).toBe('mainnet')
  })

  it('disconnects and clears address', async () => {
    const user = userEvent.setup()
    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>,
    )
    await act(async () => {
      await user.click(screen.getByText('Connect'))
      await user.click(screen.getByText('Disconnect'))
    })
    expect(screen.getByTestId('connected').textContent).toBe('false')
    expect(screen.getByTestId('address').textContent).toBe('none')
  })

  it('changes network', async () => {
    const user = userEvent.setup()
    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>,
    )
    await act(async () => {
      await user.click(screen.getByText('Set Mainnet'))
    })
    expect(screen.getByTestId('network').textContent).toBe('mainnet')
  })

  it('throws when useWallet is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow('useWallet must be used inside WalletProvider')
    consoleSpy.mockRestore()
  })

  it('connectWithXaman sets address from SDK result', async () => {
    const user = userEvent.setup()
    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>,
    )
    await act(async () => {
      await user.click(screen.getByText('Xaman Connect'))
    })
    expect(screen.getByTestId('connected').textContent).toBe('true')
    expect(screen.getByTestId('address').textContent).toBe('rXamanAddress123456789012345678')
  })

  it('createPayload returns payload info from SDK', async () => {
    const { createXamanPayload } = jest.requireMock('../lib/xaman') as {
      createXamanPayload: jest.Mock
    }
    const user = userEvent.setup()
    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>,
    )
    await act(async () => {
      await user.click(screen.getByText('Create Payload'))
    })
    expect(createXamanPayload).toHaveBeenCalled()
  })
})
