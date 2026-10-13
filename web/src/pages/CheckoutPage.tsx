import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatMoney, planTypeLabel } from '@/lib/labels'
import { getSupabase } from '@/lib/supabase'
import { ownsPlan, termUpgradePricing } from '@/lib/unlock'
import { useAppSelector } from '@/store/hooks'
import { useBuyWithWalletMutation, useGetMySubscriptionsQuery, useGetWalletQuery } from '@/store/api/studentApi'
import type { SubscriptionPlan } from '@/types/models'

function walletPurchaseError(error: unknown) {
  const text =
    typeof error === 'object' && error && 'data' in error ? String((error as { data?: unknown }).data ?? '') : ''
  if (text.includes('already subscribed')) return 'أنت مشترك في الشهر أو الترم ده بالفعل. مش هيتخصم تاني.'
  if (text.includes('insufficient')) return 'الرصيد مش كافي. اشحن المحفظة الأول.'
  return 'فشل الشراء. حاول تاني.'
}

export function CheckoutPage() {
  const { planId = '' } = useParams()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const { data: wallet } = useGetWalletQuery()
  const { data: subs = [], refetch: refetchSubs } = useGetMySubscriptionsQuery()
  const [buyWallet, walletState] = useBuyWithWalletMutation()
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [monthPlans, setMonthPlans] = useState<SubscriptionPlan[]>([])
  const [courseSlug, setCourseSlug] = useState('')
  const [error, setError] = useState('')
  const [confirmBuy, setConfirmBuy] = useState(false)

  useEffect(() => {
    void getSupabase()
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .maybeSingle()
      .then(async ({ data }) => {
        const next = (data as SubscriptionPlan | null) ?? null
        setPlan(next)
        if (!next?.course_id) return
        const course = await getSupabase().from('courses').select('slug').eq('id', next.course_id).maybeSingle()
        setCourseSlug((course.data?.slug as string | undefined) ?? '')
        if (next.type === 'full_term' && next.term_id) {
          const [months, modules] = await Promise.all([
            getSupabase()
              .from('subscription_plans')
              .select('*')
              .eq('course_id', next.course_id)
              .eq('type', 'monthly')
              .eq('is_active', true),
            getSupabase().from('course_modules').select('id').eq('term_id', next.term_id),
          ])
          const moduleIds = new Set(((modules.data ?? []) as Array<{ id: string }>).map((item) => item.id))
          setMonthPlans(
            ((months.data ?? []) as SubscriptionPlan[]).filter(
              (item) => item.term_id === next.term_id || (item.module_id && moduleIds.has(item.module_id)),
            ),
          )
        } else {
          setMonthPlans([])
        }
      })
  }, [planId])

  if (!user) return <p className="neuro-text-muted">سجّل دخول الأول.</p>
  if (!plan) return <p className="neuro-text-muted">جاري تحميل الخطة...</p>

  const alreadyOwned = ownsPlan(subs, plan)
  const pricing = termUpgradePricing(subs, plan, monthPlans)
  const due = plan.type === 'full_term' ? pricing.due : plan.price
  const credit = plan.type === 'full_term' ? pricing.credit : 0
  const balance = wallet?.balance ?? 0
  const needed = Math.max(0, due - balance)
  const canWallet = !alreadyOwned && balance >= due
  const contentPath = courseSlug
    ? plan.module_id && plan.term_id
      ? `/courses/${courseSlug}/terms/${plan.term_id}/months/${plan.module_id}`
      : plan.term_id
        ? `/courses/${courseSlug}/terms/${plan.term_id}`
        : `/courses/${courseSlug}`
    : '/courses'

  function goToContent() {
    navigate(contentPath, { replace: true })
  }

  async function buyNow() {
    if (!plan || alreadyOwned) return
    const result = await buyWallet(plan.id)
    if ('error' in result) {
      setConfirmBuy(false)
      setError(walletPurchaseError(result.error))
      return
    }
    setConfirmBuy(false)
    await refetchSubs()
    goToContent()
  }

  return (
    <div className="mx-auto max-w-xl">
      <section className="neuro-raised space-y-4 rounded-[2rem] p-6">
        <p className="text-sm neuro-accent">{planTypeLabel(plan.type)}</p>
        <h1 className="neuro-text text-3xl font-extrabold">{plan.name}</h1>
        {credit > 0 ? (
          <div className="space-y-1">
            <p className="neuro-text-muted text-lg line-through">{formatMoney(plan.price)}</p>
            <p className="text-3xl font-extrabold neuro-accent">{formatMoney(due)}</p>
            <p className="neuro-text-muted text-sm leading-7">
              اتحسب خصم {formatMoney(credit)} من {pricing.ownedMonthCount === 1 ? 'شهر اشتريته' : 'شهور اشتريتها'} قبل كده.
            </p>
          </div>
        ) : (
          <p className="text-3xl font-extrabold neuro-accent">{formatMoney(plan.price)}</p>
        )}
        <p className="neuro-text-muted leading-7">
          {plan.type === 'monthly'
            ? 'الشراء من المحفظة بيفتح الشهر ده فورًا.'
            : 'الشراء من المحفظة بيفتح كل شهور الترم فورًا. لو كنت اشتريت شهر قبل كده، سعره بيتخصم من الترم.'}
        </p>
        <div className="neuro-pressed rounded-2xl p-4">
          <p className="neuro-text-muted text-sm">رصيد المحفظة</p>
          <p className="neuro-text mt-1 text-2xl font-bold">{formatMoney(balance)}</p>
        </div>
        {error ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p> : null}
        {alreadyOwned ? (
          <div className="space-y-3">
            <p className="rounded-2xl neuro-accent-soft px-4 py-3 text-sm">
              أنت مشترك في {plan.type === 'monthly' ? 'الشهر' : 'الترم'} ده بالفعل. مش هيتخصم تاني.
            </p>
            <Button className="w-full" onClick={goToContent}>
              فتح المحتوى
            </Button>
          </div>
        ) : canWallet ? (
          <Button className="w-full" disabled={walletState.isLoading} onClick={() => setConfirmBuy(true)}>
            {walletState.isLoading ? 'بيتم الشراء...' : due === 0 ? 'تفعيل الترم' : 'شراء من المحفظة'}
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="neuro-text-muted text-sm leading-7">
              الرصيد مش كافي. محتاج {formatMoney(needed)} كمان عشان تشتري الخطة.
            </p>
            <Link to="/wallet" className="block">
              <Button className="w-full">اشحن المحفظة</Button>
            </Link>
          </div>
        )}
        <Link to="/courses" className="block text-center text-sm neuro-accent">
          الرجوع للكورسات
        </Link>
      </section>

      <ConfirmDialog
        open={confirmBuy}
        title="تأكيد الشراء"
        text={
          credit > 0
            ? `سعر الترم ${formatMoney(plan.price)}، وخصم الشهور المشتراة ${formatMoney(credit)}. هيتخصم ${formatMoney(due)} من محفظتك وهيتفتح الترم كامل.`
            : `هيتخصم ${formatMoney(due)} من محفظتك، وهيتفتح ${plan.type === 'monthly' ? 'الشهر' : 'الترم'} فورًا.`
        }
        confirmLabel="تأكيد الشراء"
        busy={walletState.isLoading}
        onClose={() => {
          if (!walletState.isLoading) setConfirmBuy(false)
        }}
        onConfirm={() => {
          void buyNow()
        }}
      />
    </div>
  )
}
