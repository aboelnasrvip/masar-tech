import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cx } from '@/lib/cx'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  icon?: ReactNode
  ltr?: boolean
}

export function Input({ label, error, icon, ltr, className, id, type = 'text', ...props }: InputProps) {
  const inputId = id ?? props.name
  const isPassword = type === 'password'
  const [visible, setVisible] = useState(false)

  return (
    <label className="block space-y-2" htmlFor={inputId}>
      <span className="neuro-text text-sm font-semibold">{label}</span>
      <span className="relative block">
        {icon ? (
          <span className="neuro-text-muted pointer-events-none absolute top-1/2 right-4 -translate-y-1/2">
            {icon}
          </span>
        ) : null}
        <input
          id={inputId}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={Boolean(error)}
          className={cx(
            'neuro-input w-full rounded-2xl px-4 py-3 text-sm',
            icon ? 'pr-12' : undefined,
            isPassword ? 'pl-12' : undefined,
            ltr ? 'ltr-input' : undefined,
            error ? 'ring-1 ring-red-400/80' : undefined,
            className,
          )}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            className="neuro-text-muted absolute top-1/2 left-4 -translate-y-1/2"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </span>
      {error ? <span className="block text-xs text-red-500">{error}</span> : null}
    </label>
  )
}
