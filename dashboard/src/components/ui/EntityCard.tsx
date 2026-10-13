import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Pencil, Plus, Trash2, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cx } from '@/lib/cx'

export type EntityTone = 'course' | 'term' | 'month' | 'lesson'

export function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'flex h-10 w-10 items-center justify-center rounded-2xl neuro-raised-xs neuro-hover',
        danger ? 'neuro-danger' : 'neuro-text',
      )}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
    >
      {children}
    </button>
  )
}

export function StatusChip({ visible }: { visible: boolean }) {
  if (!visible) {
    return (
      <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold neuro-warning-soft">
        <EyeOff className="h-3.5 w-3.5" />
        مخفي
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold neuro-success-soft">
      <Eye className="h-3.5 w-3.5" />
      ظاهر
    </span>
  )
}

export function PageHeader({
  crumbs,
  title,
  visible,
  onEdit,
  onAdd,
  addLabel,
  children,
}: {
  crumbs?: Array<{ to: string; label: string }>
  title: string
  visible?: boolean
  onEdit?: () => void
  onAdd?: () => void
  addLabel?: string
  children?: ReactNode
}) {
  return (
    <div className="space-y-3">
      {crumbs?.length ? (
        <p className="neuro-text-muted text-sm">
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.to}-${crumb.label}`}>
              {index > 0 ? ' / ' : null}
              <Link to={crumb.to} className="neuro-accent font-semibold">
                {crumb.label}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
      <div className="neuro-raised-sm flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="neuro-text truncate text-2xl font-extrabold">{title}</h2>
          {visible !== undefined ? <StatusChip visible={visible} /> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onEdit ? (
            <IconButton label="تعديل" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </IconButton>
          ) : null}
          {onAdd ? (
            <Button onClick={onAdd}>
              <Plus className="h-4 w-4" />
              {addLabel}
            </Button>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  )
}

export function EntityCard({
  to,
  title,
  subtitle,
  description,
  imageUrl,
  visible = true,
  tone = 'course',
  icon: Icon,
  meta,
  onEdit,
  onDelete,
}: {
  to: string
  title: string
  subtitle?: string
  description?: string | null
  imageUrl?: string | null
  visible?: boolean
  tone?: EntityTone
  icon?: LucideIcon
  meta?: string
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <div className="relative h-full overflow-hidden rounded-3xl neuro-raised-sm">
      <Link to={to} className="neuro-hover flex h-full flex-col">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-36 w-full object-cover" />
        ) : (
          <div className={cx('flex h-36 items-center justify-center', `tone-${tone}-bg`)}>
            {Icon ? <Icon className={cx('h-10 w-10', `tone-${tone}`)} /> : null}
          </div>
        )}
        <div className="flex flex-1 flex-col p-5">
          {subtitle ? <p className={cx('text-sm font-semibold', `tone-${tone}`)}>{subtitle}</p> : null}
          <h3 className="neuro-text mt-1 text-xl font-bold">{title}</h3>
          {description ? <p className="neuro-text-muted mt-2 line-clamp-2 flex-1 text-sm">{description}</p> : <span className="flex-1" />}
          {meta ? <p className={cx('mt-3 font-bold', `tone-${tone}`)}>{meta}</p> : null}
        </div>
      </Link>
      {!visible ? (
        <span className="pointer-events-none absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-2xl neuro-raised-xs neuro-warning">
          <EyeOff className="h-4 w-4" />
        </span>
      ) : null}
      <div className="absolute top-3 left-3 z-10 flex gap-1">
        {onEdit ? (
          <IconButton label="تعديل" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </IconButton>
        ) : null}
        {onDelete ? (
          <IconButton label="حذف" danger onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        ) : null}
      </div>
    </div>
  )
}
