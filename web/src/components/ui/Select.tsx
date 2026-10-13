import type { SelectHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  error?: string
  options: Array<{ value: string; label: string }>
}

export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  const selectId = id ?? props.name

  return (
    <label className="block space-y-2" htmlFor={selectId}>
      <span className="neuro-text text-sm font-semibold">{label}</span>
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        className={cx(
          'neuro-input w-full appearance-none rounded-2xl px-4 py-3 text-sm',
          error ? 'ring-1 ring-red-400/80' : undefined,
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="block text-xs text-red-500">{error}</span> : null}
    </label>
  )
}
