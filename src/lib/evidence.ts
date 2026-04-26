import type { ClaimEvidence } from '../types'

/**
 * Serialize a ClaimEvidence object to a pretty JSON string.
 */
export function serializeEvidence(evidence: ClaimEvidence): string {
  return JSON.stringify(evidence, null, 2)
}

/**
 * Trigger a browser download of the evidence JSON file.
 */
export function downloadEvidenceFile(evidence: ClaimEvidence): void {
  const json = serializeEvidence(evidence)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `printledger-evidence-${evidence.nftTokenId.slice(0, 8)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
