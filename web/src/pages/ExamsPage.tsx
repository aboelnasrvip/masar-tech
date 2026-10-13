import { Link } from 'react-router-dom'
import { ClipboardList, Clock } from 'lucide-react'
import { formatDateTime, gradeLabel } from '@/lib/labels'
import { useAppSelector } from '@/store/hooks'
import { useGetExamsQuery } from '@/store/api/studentApi'

export function ExamsPage() {
  const profile = useAppSelector((state) => state.auth.profile)
  const { data = [], isLoading } = useGetExamsQuery()
  const now = Date.now()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="neuro-text text-3xl font-extrabold">الامتحانات</h1>
        <p className="neuro-text-muted mt-2">
          امتحانات {profile?.grade ? gradeLabel(profile.grade) : 'صفك'}. ادخل في المعاد، والتايمر هيعد تنازلي لحد التسليم.
        </p>
      </div>
      {isLoading ? <p className="neuro-text-muted">جاري التحميل...</p> : null}
      <div className="space-y-3">
        {data.map((exam) => {
          const start = new Date(exam.starts_at).getTime()
          const end = start + exam.duration_minutes * 60 * 1000
          const status = now < start ? 'upcoming' : now > end ? 'ended' : 'open'
          return (
            <Link key={exam.id} to={`/exams/${exam.id}`} className="neuro-raised-sm neuro-hover block rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="neuro-text text-xl font-extrabold">{exam.title}</h2>
                <span className="neuro-accent-soft rounded-full px-3 py-1 text-xs font-bold">
                  {status === 'upcoming' ? 'لسه ما بدأ' : status === 'open' ? 'شغال دلوقتي' : 'الوقت خلص'}
                </span>
              </div>
              <p className="neuro-text-muted mt-2 flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                يبدأ {formatDateTime(exam.starts_at)} — المدة {exam.duration_minutes} دقيقة
              </p>
              {exam.description ? <p className="neuro-text-muted mt-2 text-sm">{exam.description}</p> : null}
            </Link>
          )
        })}
      </div>
      {!isLoading && data.length === 0 ? (
        <p className="neuro-text-muted flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          مفيش امتحانات معلنة لصفك دلوقتي.
        </p>
      ) : null}
    </div>
  )
}
