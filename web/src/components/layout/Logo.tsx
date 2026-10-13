import { Link } from 'react-router-dom'
import { Route } from 'lucide-react'
import { env } from '@/lib/env'

type LogoProps = {
  to?: string
  compact?: boolean
}

export function Logo({ to = '/', compact = false }: LogoProps) {
  return (
    <Link to={to} className="flex items-center gap-3">
      <span className="neuro-raised-xs flex h-11 w-11 items-center justify-center rounded-2xl">
        <Route className="h-5 w-5 neuro-accent" />
      </span>
      {compact ? null : (
        <span className="text-right">
          <strong className="neuro-text block text-lg font-extrabold tracking-tight" dir="ltr">
            {env.appName}
          </strong>
          <span className="neuro-text-muted mt-1 block text-xs">مسار واضح لتعلّم البرمجة</span>
        </span>
      )}
    </Link>
  )
}
