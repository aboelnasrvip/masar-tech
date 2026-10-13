import { useGetNotificationsQuery, useMarkReadMutation } from '@/store/api/studentApi'

export function NotificationsPage() {
  const { data = [], refetch } = useGetNotificationsQuery(undefined, { pollingInterval: 10000 })
  const [markRead] = useMarkReadMutation()

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <button
          key={item.id}
          type="button"
          className="neuro-raised-sm w-full rounded-3xl p-5 text-right"
          onClick={() => void markRead(item.id).then(() => refetch())}
        >
          <h3 className="neuro-text font-bold">{item.title}</h3>
          <p className="neuro-text-muted mt-2 text-sm">{item.body}</p>
          {!item.is_read ? <span className="mt-2 inline-block text-xs neuro-accent">جديد</span> : null}
        </button>
      ))}
      {data.length === 0 ? <p className="neuro-text-muted">مفيش إشعارات.</p> : null}
    </div>
  )
}
