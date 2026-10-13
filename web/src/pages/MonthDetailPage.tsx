import { Link, useParams } from 'react-router-dom'
import { CardGrid } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/lib/labels'
import { hasMonthAccess, lessonLockState, lockLabel } from '@/lib/unlock'
import { useGetMonthPageQuery, useGetMySubscriptionsQuery } from '@/store/api/studentApi'

export function MonthDetailPage() {
  const { slug = '', termId = '', monthId = '' } = useParams()
  const { data } = useGetMonthPageQuery({ slug, monthId }, { skip: !slug || !monthId })
  const { data: subs = [] } = useGetMySubscriptionsQuery()

  if (!data) return <p className="neuro-text-muted">جاري التحميل...</p>

  const entitled = hasMonthAccess(subs, data.course.id, data.term?.id, data.month.id)
  const progressByLesson = Object.fromEntries(data.progress.map((item) => [item.lesson_id, item]))
  const lessons = [...data.lessons].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="space-y-5">
      <p className="neuro-text-muted text-sm">
        <Link to={`/courses/${slug}`} className="neuro-accent">
          {data.course.title}
        </Link>
        {data.term ? (
          <>
            {' / '}
            <Link to={`/courses/${slug}/terms/${termId || data.term.id}`} className="neuro-accent">
              {data.term.title}
            </Link>
          </>
        ) : null}
      </p>
      <section className="neuro-raised space-y-3 rounded-[2rem] p-6">
        <h1 className="neuro-text text-3xl font-extrabold">{data.month.title}</h1>
        <p className="neuro-text-muted leading-8">{data.month.description}</p>
        {entitled ? (
          <p className="text-sm neuro-accent">الشهر مفتوح. الدروس ظاهرة، والفيديو يتفتح بعد تسليم واجب الدرس اللي قبله.</p>
        ) : data.plan ? (
          <Link to={`/checkout/${data.plan.id}`}>
            <Button>اشترِ الشهر — {formatMoney(data.plan.price)}</Button>
          </Link>
        ) : (
          <p className="neuro-text-muted text-sm">محتاج شراء الشهر أو الترم.</p>
        )}
      </section>

      <CardGrid>
        {lessons.map((lesson, index) => {
          const lock = entitled ? lessonLockState(lesson, lessons, progressByLesson, data.requiredAssignments) : null
          const open = Boolean(entitled && lock?.unlocked)
          return (
            <Link
              key={lesson.id}
              to={open ? `/lessons/${lesson.id}` : '#'}
              onClick={(event) => {
                if (!open) event.preventDefault()
              }}
              className="neuro-raised-sm neuro-hover flex h-full flex-col rounded-3xl p-5"
            >
              <p className="text-sm neuro-accent">{open ? 'متاح' : 'ظاهر ومقفول'}</p>
              <h2 className="neuro-text mt-1 text-xl font-extrabold">
                درس {index + 1}: {lesson.title}
              </h2>
              <p className="neuro-text-muted mt-2 flex-1 text-sm">
                {!entitled
                  ? 'اشترِ الشهر أو الترم عشان تفتح المحتوى'
                  : lock && !lock.unlocked
                    ? lockLabel(lock.reason, lesson.available_at)
                    : 'افتح الدرس'}
              </p>
            </Link>
          )
        })}
      </CardGrid>
      {lessons.length === 0 ? <p className="neuro-text-muted">لسه مفيش دروس في الشهر ده.</p> : null}
    </div>
  )
}
