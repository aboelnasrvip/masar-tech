import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'raised' | 'ghost'
  children: ReactNode
}

export function Button({
  variant = 'primary',
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'neuro-brand neuro-hover',
        variant === 'raised' && 'neuro-raised-xs neuro-hover neuro-text',
        variant === 'ghost' && 'neuro-text-muted hover:neuro-text',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
