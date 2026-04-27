import { ExternalLink, Loader2, CheckCircle, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { XamanPayloadInfo } from '@/lib/xaman'

export type SigningStatus = 'pending' | 'signed' | 'rejected'

interface Props {
  /** Whether the modal is visible. */
  open: boolean
  /** Payload info returned by createXamanPayload (null while loading). */
  payload: XamanPayloadInfo | null
  /** Current signing status. */
  status: SigningStatus
  /** On-ledger transaction hash — populated after successful sign. */
  txid?: string
  /** Called when the user dismisses the modal. */
  onClose: () => void
  /** Optional title override. */
  title?: string
}

/**
 * Displays a Xaman signing request QR code and deep-link.
 * Shows status feedback when the payload is signed or rejected.
 */
export function XamanSigningModal({
  open,
  payload,
  status,
  txid,
  onClose,
  title = 'Sign with Xaman',
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {status === 'pending' && 'Scan the QR code in Xaman or tap the button on mobile.'}
            {status === 'signed' && 'Transaction signed and submitted to the XRPL.'}
            {status === 'rejected' && 'The signing request was rejected or expired.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {status === 'pending' && !payload && (
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          )}

          {status === 'pending' && payload && (
            <>
              <img
                src={payload.qrUrl}
                alt="Xaman QR code"
                className="h-48 w-48 rounded-md border"
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2 w-full"
                asChild
              >
                <a href={payload.redirectUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open in Xaman (mobile)
                </a>
              </Button>
            </>
          )}

          {status === 'signed' && (
            <div className="flex flex-col items-center gap-2 text-green-600">
              <CheckCircle className="h-10 w-10" />
              <p className="text-sm font-medium">Transaction submitted</p>
              {txid && (
                <p className="text-xs text-muted-foreground break-all text-center">
                  TX: {txid}
                </p>
              )}
            </div>
          )}

          {status === 'rejected' && (
            <div className="flex flex-col items-center gap-2 text-destructive">
              <XCircle className="h-10 w-10" />
              <p className="text-sm font-medium">Request rejected</p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            {status === 'pending' ? 'Cancel' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
