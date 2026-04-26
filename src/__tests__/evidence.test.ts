import { serializeEvidence } from '../lib/evidence'
import type { ClaimEvidence } from '../types'

const MOCK_EVIDENCE: ClaimEvidence = {
  nftTokenId: '000800002B19E0B83A8DFD9B9587D4A1E44EF09F1B4D72790000000000000001',
  ownerAddress: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
  issuedBy: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
  mintTxHash: 'ABC123',
  transferHistory: [
    {
      txHash: 'ABC123',
      from: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
      to: '',
      timestamp: '2024-01-01T00:00:00.000Z',
    },
  ],
  exportedAt: '2024-06-01T12:00:00.000Z',
}

describe('serializeEvidence', () => {
  it('serializes evidence to pretty JSON', () => {
    const json = serializeEvidence(MOCK_EVIDENCE)
    expect(typeof json).toBe('string')
    const parsed = JSON.parse(json) as ClaimEvidence
    expect(parsed.nftTokenId).toBe(MOCK_EVIDENCE.nftTokenId)
    expect(parsed.ownerAddress).toBe(MOCK_EVIDENCE.ownerAddress)
    expect(parsed.transferHistory).toHaveLength(1)
  })

  it('produces formatted (indented) JSON', () => {
    const json = serializeEvidence(MOCK_EVIDENCE)
    expect(json).toContain('\n')
    expect(json).toContain('  ')
  })
})
