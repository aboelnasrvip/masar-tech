import { formatMoney, walletTypeLabel } from '@/lib/labels'
import { useGetWalletQuery } from '@/store/api/adminApi'

export function WalletPage() {
  const { data = [] } = useGetWalletQuery()

  return (
    <div className="space-y-3">
      {data.length === 0 ? <p className="neuro-text-muted">مفيش حركات محفظة.</p> : null}
      {data.map((item) => (
        <article key={item.id} className="neuro-raised-sm rounded-3xl p-5">
          <p className="neuro-text font-bold">
            {item.profiles?.full_name ?? 'طالب'} — {item.amount > 0 ? '+' : ''}
            {formatMoney(item.amount)}
          </p>
          <p className="neuro-text-muted text-sm">
            {walletTypeLabel(item.type)} — {item.description}
          </p>
        </article>
      ))}
    </div>
  )
}
