import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NFTCard } from '../components/browse/NFTCard'
import type { NFTListing } from '../types'

const MOCK_LISTING: NFTListing = {
  nftTokenId: '000800002B19E0B83A8DFD9B9587D4A1E44EF09F1B4D72790000000000000001',
  issuer: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
  owner: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
  metadata: {
    name: 'Test Dragon',
    description: 'A test dragon model',
    imageUri: '',
    modelUri: 'ipfs://bafytest',
    licenseTerms: 'Personal Use Only',
    tags: ['dragon', 'test'],
    schemaVersion: '1.0',
  },
  transferFee: 10000,
  burnable: true,
  flags: 0x00000001 | 0x00000008,
  sellOffers: [{ offerIndex: 'ABC123', amount: '5000000', flags: 1 }],
}

describe('NFTCard', () => {
  it('renders the model name', () => {
    render(
      <MemoryRouter>
        <NFTCard listing={MOCK_LISTING} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Test Dragon')).toBeInTheDocument()
  })

  it('displays the price from the lowest offer', () => {
    render(
      <MemoryRouter>
        <NFTCard listing={MOCK_LISTING} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/5\.000000 XRP/)).toBeInTheDocument()
  })

  it('shows "Not listed" when no sell offers', () => {
    render(
      <MemoryRouter>
        <NFTCard listing={{ ...MOCK_LISTING, sellOffers: [] }} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Not listed')).toBeInTheDocument()
  })

  it('shows revocable badge for burnable NFTs', () => {
    render(
      <MemoryRouter>
        <NFTCard listing={MOCK_LISTING} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Revocable')).toBeInTheDocument()
  })

  it('shows tags', () => {
    render(
      <MemoryRouter>
        <NFTCard listing={MOCK_LISTING} />
      </MemoryRouter>,
    )
    expect(screen.getByText('dragon')).toBeInTheDocument()
    expect(screen.getByText('test')).toBeInTheDocument()
  })

  it('renders a View link', () => {
    render(
      <MemoryRouter>
        <NFTCard listing={MOCK_LISTING} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /View/i })).toBeInTheDocument()
  })
})
