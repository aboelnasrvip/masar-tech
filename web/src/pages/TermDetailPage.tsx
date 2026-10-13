import { Link, useParams } from 'react-router-dom'
import { CardGrid } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/lib/labels'
import { hasMonthAccess, hasTermAccess, termUpgradePricing } from '@/lib/unlock'
import { useGetMySubscriptionsQuery, useGetTermPageQuery } from '@/store/api/studentApi'

export function TermDetailPage() {
  const { slug = '', termId = '' } = useParams()
  const { data } = useGetTermPageQuery({ slug, termId }, { skip: !slug || !termId })
  const { data: subs = [] } = useGetMySubscriptionsQuery()

  if (!data) return <p className="neuro-text-muted">جاري التحميل...</p>

  const termOwned = hasTermAccess(subs, data.course.id, data.term.id)
  const termPlan = data.plans.find((item) => item.type === 'full_term' && item.term_id === data.term.id)
  const monthPlans = data.plans.filter(
    (item) =>
      item.type === 'monthly' &&
      (item.term_id === data.term.id || data.months.some((month) => month.id === item.module_id)),
  )
  const upgrade = termPlan ? termUpgradePricing(subs, termPlan, monthPlans) : null

  return (
    <div className="space-y-5">
      <p className="neuro-text-muted text-sm">
        <Link to={`/courses/${slug}`} className="neuro-accent">
          {data.course.title}
        </Link>
      </p>
      <section className="neuro-raised overflow-hidden rounded-[2rem]">
        {data.term.image_url ? <img src={data.term.image_url} alt="" className="h-48 w-full object-cover" /> : null}
        <div className="space-y-3 p-6">
          <h1 className="neuro-text text-3xl font-extrabold">{data.term.title}</h1>
          <p className="neuro-text-muted leading-8">{data.term.description}</p>
          {termOwned ? (
            <p className="text-sm neuro-accent">الترم مفتوح عندك. اختار شهر من تحت.</p>
          ) : termPlan ? (
            <Link to={`/checkout/${termPlan.id}`} className="block">
              <Button className="w-full md:w-auto">
                {upgrade && upgrade.credit > 0
                  ? `ترقية للترم كامل — ${formatMoney(upgrade.due)} بعد خصم الشهور`
                  : `اشترِ الترم كامل — ${formatMoney(termPlan.price)}`}
              </Button>
            </Link>
          ) : (
            <p className="neuro-text-muted text-sm">تقدر تشتري شهر لوحده.</p>
          )}
        </div>
      </section>

      <CardGrid>
        {data.months.map((month) => {
          const monthOwned = hasMonthAccess(subs, data.course.id, data.term.id, month.id)
          const monthPlan = data.plans.find((item) => item.type === 'monthly' && item.module_id === month.id)
          return (
            <Link
              key={month.id}
              to={`/courses/${slug}/terms/${termId}/months/${month.id}`}
              className="neuro-raised-sm neuro-hover flex h-full flex-col rounded-3xl p-5"
            >
              <p className="text-sm neuro-accent">{monthOwned ? 'مفتوح' : monthPlan ? formatMoney(monthPlan.price) : formatMoney(month.price ?? 0)}</p>
              <h2 className="neuro-text mt-1 text-xl font-extrabold">{month.title}</h2>
              <p className="neuro-text-muted mt-2 flex-1 text-sm leading-7">{month.description}</p>
            </Link>
          )
        })}
      </CardGrid>
      {data.months.length === 0 ? <p className="neuro-text-muted">الأدمن لسه ما أضافش شهور للترم ده.</p> : null}
    </div>
  )
}
