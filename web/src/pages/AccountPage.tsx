import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { firstRelation, formatDate, planTypeLabel, subscriptionStatusLabel } from '@/lib/labels'
import { useGetMySubscriptionsQuery } from '@/store/api/studentApi'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { signOut } from '@/store/slices/authSlice'

export function AccountPage() {
  const dispatch = useAppDispatch()
  const { user, profile } = useAppSelector((state) => state.auth)
  const { data: subs = [] } = useGetMySubscriptionsQuery()

  return (
    <div className="space-y-5">
      <div className="neuro-raised rounded-[2rem] p-8">
        <h1 className="neuro-text text-3xl font-extrabold">حسابي</h1>
        <p className="neuro-text-muted mt-3 leading-8">أهلاً {profile?.full_name || 'يا بطل'}.</p>
        <dl className="mt-8 grid gap-4 md:grid-cols-2">
          <Info label="الإيميل" value={user?.email ?? '—'} />
          <Info label="رقم التليفون" value={profile?.phone ?? '—'} />
          <Info label="الصف" value={profile?.grade ?? '—'} />
          <Info label="المحافظة" value={profile?.governorate ?? '—'} />
        </dl>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/courses">
            <Button variant="raised">كورساتي</Button>
          </Link>
          <Link to="/wallet">
            <Button variant="raised">المحفظة</Button>
          </Link>
          <Button variant="ghost" onClick={() => void dispatch(signOut())}>
            تسجيل الخروج
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="neuro-text text-xl font-bold">الاشتراكات السارية</h2>
        {subs.length === 0 ? <p className="neuro-text-muted">مفيش اشتراك ساري. اختار خطة من الكورسات.</p> : null}
        {subs.map((item) => {
          const course = firstRelation(item.courses)
          const plan = firstRelation(item.subscription_plans)
          return (
            <article key={item.id} className="neuro-raised-sm rounded-3xl p-4">
              <p className="font-bold">{course?.title ?? 'كورس'}</p>
              <p className="neuro-text-muted text-sm">
                {plan?.name} — {plan ? planTypeLabel(plan.type) : ''} — {subscriptionStatusLabel(item.status)} — {item.ends_at ? `لحد ${formatDate(item.ends_at)}` : 'مدى الحياة'}
              </p>
            </article>
          )
        })}
      </section>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="neuro-pressed rounded-2xl p-4">
      <dt className="neuro-text-muted text-xs">{label}</dt>
      <dd className="neuro-text mt-1 font-semibold">{value}</dd>
    </div>
  )
}
