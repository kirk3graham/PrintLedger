import {
  dropsToXrp,
  xrpToDrops,
  truncateAddress,
  encodeMetadataUri,
  decodeMetadataUri,
  isValidXrplAddress,
  formatTransferFee,
  percentToTransferFee,
  buildXamanDeepLink,
} from '../lib/utils'

describe('dropsToXrp', () => {
  it('converts drops to XRP string', () => {
    expect(dropsToXrp(1_000_000)).toBe('1.000000')
    expect(dropsToXrp('5000000')).toBe('5.000000')
    expect(dropsToXrp(1)).toBe('0.000001')
  })
})

describe('xrpToDrops', () => {
  it('converts XRP to drops string', () => {
    expect(xrpToDrops(1)).toBe('1000000')
    expect(xrpToDrops('5.5')).toBe('5500000')
    expect(xrpToDrops(0.000001)).toBe('1')
  })
})

describe('truncateAddress', () => {
  it('truncates a long address', () => {
    const addr = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'
    const truncated = truncateAddress(addr)
    expect(truncated).toMatch(/^rHb9CJ\.\.\..{4}$/)
    expect(truncated.length).toBeLessThan(addr.length)
  })

  it('returns short addresses unchanged', () => {
    expect(truncateAddress('rShort')).toBe('rShort')
  })
})

describe('encodeMetadataUri / decodeMetadataUri', () => {
  it('round-trips metadata through hex encoding', () => {
    const meta = { name: 'Test Model', tags: ['a', 'b'], schemaVersion: '1.0' }
    const hex = encodeMetadataUri(meta)
    expect(typeof hex).toBe('string')
    expect(hex).toMatch(/^[0-9A-F]+$/)
    const decoded = decodeMetadataUri(hex)
    expect(decoded).toEqual(meta)
  })

  it('returns null for invalid hex', () => {
    expect(decodeMetadataUri('ZZZ')).toBeNull()
  })
})

describe('isValidXrplAddress', () => {
  it('validates correct XRPL addresses', () => {
    expect(isValidXrplAddress('rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh')).toBe(true)
    expect(isValidXrplAddress('rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe')).toBe(true)
  })

  it('rejects invalid addresses', () => {
    expect(isValidXrplAddress('invalid')).toBe(false)
    expect(isValidXrplAddress('')).toBe(false)
    expect(isValidXrplAddress('0xdeadbeef')).toBe(false)
  })
})

describe('formatTransferFee', () => {
  it('formats transfer fee correctly', () => {
    expect(formatTransferFee(0)).toBe('0.0%')
    expect(formatTransferFee(10000)).toBe('10.0%')
    expect(formatTransferFee(50000)).toBe('50.0%')
    expect(formatTransferFee(5000)).toBe('5.0%')
  })
})

describe('percentToTransferFee', () => {
  it('converts percentage to transfer fee integer', () => {
    expect(percentToTransferFee(0)).toBe(0)
    expect(percentToTransferFee(10)).toBe(10000)
    expect(percentToTransferFee(50)).toBe(50000)
    expect(percentToTransferFee(5.5)).toBe(5500)
  })

  it('clamps values outside 0-50 range', () => {
    expect(percentToTransferFee(-5)).toBe(0)
    expect(percentToTransferFee(100)).toBe(50000)
  })
})

describe('buildXamanDeepLink', () => {
  it('builds a valid Xaman deep-link URL', () => {
    const link = buildXamanDeepLink('test-uuid-123')
    expect(link).toBe('https://xaman.app/sign/test-uuid-123')
  })
})
