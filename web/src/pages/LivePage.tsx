import { gradeLabel } from '@/lib/labels'
import { useGetSessionsQuery } from '@/store/api/studentApi'
import { useAppSelector } from '@/store/hooks'

export function LivePage() {
  const profile = useAppSelector((state) => state.auth.profile)
  const { data = [] } = useGetSessionsQuery()

  return (
    <div className="space-y-3">
      <div>
        <h1 className="neuro-text text-3xl font-extrabold">المحاضرات اللايف</h1>
        <p className="neuro-text-muted mt-2">
          المحاضرات الظاهرة هنا لصفك{profile?.grade ? ` (${gradeLabel(profile.grade)})` : ''} أو لكل السنوات.
        </p>
      </div>
      {data.map((session) => (
        <article key={session.id} className="neuro-raised-sm rounded-3xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="neuro-text text-xl font-bold">{session.title}</h3>
            <span className="neuro-accent-soft rounded-full px-3 py-1 text-xs font-bold">
              {session.grade ? gradeLabel(session.grade) : 'كل السنوات'}
            </span>
          </div>
          <p className="neuro-text-muted mt-2">{new Date(session.starts_at).toLocaleString('ar-EG')}</p>
          {session.join_url ? (
            <a href={session.join_url} className="mt-3 inline-block neuro-accent" target="_blank" rel="noreferrer">
              انضمام
            </a>
          ) : null}
        </article>
      ))}
      {data.length === 0 ? <p className="neuro-text-muted">مفيش محاضرات معلنة لصفك دلوقتي.</p> : null}
    </div>
  )
}
