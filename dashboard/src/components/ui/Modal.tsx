import type { ReactNode } from 'react'

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="إغلاق" />
      <div className="neuro-raised relative z-10 max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[2rem] p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="neuro-text text-2xl font-extrabold">{title}</h3>
          <button type="button" className="neuro-text-muted text-sm" onClick={onClose}>
            إغلاق
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
