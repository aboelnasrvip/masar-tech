import { Link, useParams } from 'react-router-dom'
import { CardGrid } from '@/components/ui/ConfirmDialog'
import { formatMoney, gradeLabel } from '@/lib/labels'
import { hasTermAccess } from '@/lib/unlock'
import { useGetCoursePageQuery, useGetMySubscriptionsQuery } from '@/store/api/studentApi'

export function CourseDetailPage() {
  const { slug = '' } = useParams()
  const { data } = useGetCoursePageQuery(slug, { skip: !slug })
  const { data: subs = [] } = useGetMySubscriptionsQuery()

  if (!data) return <p className="neuro-text-muted">جاري التحميل...</p>

  return (
    <div className="space-y-5">
      <section className="neuro-raised overflow-hidden rounded-[2rem]">
        {data.course.image_url ? (
          <img src={data.course.image_url} alt="" className="h-52 w-full object-cover" />
        ) : null}
        <div className="p-6">
          <p className="text-sm neuro-accent">
            {data.course.subject} — {gradeLabel(data.course.grade)}
          </p>
          <h1 className="neuro-text mt-2 text-3xl font-extrabold">{data.course.title}</h1>
          <p className="neuro-text-muted mt-3 leading-8">{data.course.description}</p>
        </div>
      </section>

      <CardGrid>
        {data.terms.map((term) => {
          const owned = hasTermAccess(subs, data.course.id, term.id)
          const months = data.modules.filter((item) => item.term_id === term.id).length
          return (
            <Link
              key={term.id}
              to={`/courses/${slug}/terms/${term.id}`}
              className="neuro-raised-sm neuro-hover flex h-full flex-col overflow-hidden rounded-3xl"
            >
              {term.image_url ? (
                <img src={term.image_url} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="h-40 tone-course-bg" />
              )}
              <div className="flex flex-1 flex-col p-5">
                <p className="text-sm neuro-accent">{owned ? 'مشترك في الترم' : `${months} شهور`}</p>
                <h2 className="neuro-text mt-1 text-2xl font-extrabold">{term.title}</h2>
                <p className="neuro-text-muted mt-2 flex-1 text-sm leading-7">{term.description}</p>
                <p className="mt-3 text-lg font-bold neuro-accent">{formatMoney(term.price)} للترم كامل</p>
              </div>
            </Link>
          )
        })}
      </CardGrid>
      {data.terms.length === 0 && data.modules.length > 0 ? (
        <section className="space-y-3">
          <p className="neuro-text-muted text-sm">التيرمات لسه مش ظاهرة. تقدر تشتري من الخطط دي لحد ما الأدمن يضيف الترم.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {data.plans.map((plan) => (
              <Link key={plan.id} to={`/checkout/${plan.id}`} className="neuro-pressed rounded-2xl p-4">
                <p className="neuro-text font-bold">{plan.name}</p>
                <p className="mt-2 text-xl neuro-accent">{formatMoney(plan.price)}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {data.terms.length === 0 && data.modules.length === 0 ? (
        <p className="neuro-text-muted">الأدمن لسه ما أضافش تيرمات للكورس ده. شغّل ملف 00006 في Supabase لو الكورس قديم.</p>
      ) : null}
    </div>
  )
}
