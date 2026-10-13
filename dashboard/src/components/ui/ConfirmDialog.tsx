import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel = 'تأكيد',
  cancelLabel = 'رجوع',
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  text: string
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="إغلاق" />
      <div className="neuro-raised relative z-10 w-full max-w-md space-y-4 rounded-[2rem] p-6">
        <h3 className="neuro-text text-2xl font-extrabold">{title}</h3>
        <p className="neuro-text-muted leading-7">{text}</p>
        <div className="flex gap-2">
          <Button disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="raised" onClick={onClose}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
}
