import { useEffect, useState, type FormEvent } from 'react'
import { Check, Copy, ImagePlus, Nfc, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'
import {
  firstRelation,
  formatDate,
  formatMoney,
  paymentKindLabel,
  paymentStatusLabel,
  planTypeLabel,
  subscriptionStatusLabel,
  walletTypeLabel,
} from '@/lib/labels'
import { env } from '@/lib/env'
import { useAppSelector } from '@/store/hooks'
import {
  useGetMySubscriptionsQuery,
  useGetPaymentMethodsQuery,
  useGetPaymentsQuery,
  useGetWalletQuery,
  useSubmitPaymentMutation,
} from '@/store/api/studentApi'

export function WalletPage() {
  const user = useAppSelector((state) => state.auth.user)
  const profile = useAppSelector((state) => state.auth.profile)
  const { data: wallet, refetch: refetchWallet } = useGetWalletQuery()
  const { data: payments = [], refetch: refetchPayments } = useGetPaymentsQuery()
  const { data: subs = [], refetch: refetchSubs } = useGetMySubscriptionsQuery()
  const { data: methods = [] } = useGetPaymentMethodsQuery()
  const [submitPayment, submitState] = useSubmitPaymentMutation()
  const [amount, setAmount] = useState('150')
  const [method, setMethod] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void refetchWallet()
    void refetchPayments()
    void refetchSubs()
  }, [refetchWallet, refetchPayments, refetchSubs])

  useEffect(() => {
    if (methods[0] && !methods.some((item) => item.id === method)) setMethod(methods[0].id)
  }, [methods, method])

  useEffect(() => {
    setCopied(false)
  }, [method])

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const last4 = (profile?.phone || '0000').replace(/\D/g, '').slice(-4).padStart(4, '0')
  const value = Number(amount)

  function onDeposit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!user || !file || !value || value < 10 || !method) {
      setError('اختار طريقة الدفع، اكتب مبلغ 10 ج على الأقل، وارفع صورة الإيصال.')
      return
    }
    setConfirmOpen(true)
  }

  async function copyAccount(account: string) {
    try {
      await navigator.clipboard.writeText(account)
    } catch {
      const input = document.createElement('textarea')
      input.value = account
      input.setAttribute('readonly', '')
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  async function sendDeposit() {
    if (!user || !file || !value || value < 10) return
    const result = await submitPayment({
      studentId: user.id,
      method: method || methods[0]?.id || 'receipt',
      reference: null,
      file,
      kind: 'wallet_deposit',
      amount: value,
    })
    if ('error' in result) {
      setConfirmOpen(false)
      setError('فشل إرسال طلب الشحن.')
      return
    }
    setConfirmOpen(false)
    setFile(null)
    setAmount('150')
    setSuccessOpen(true)
    void refetchPayments()
    void refetchWallet()
  }

  const selected = methods.find((item) => item.id === method)

  return (
    <div className="space-y-5">
      <section className="wallet-card p-6">
        <div className="relative z-10 flex h-full min-h-[210px] flex-col">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs tracking-[0.28em] text-white/70">GO TECH</p>
              <p className="mt-1 text-sm font-semibold text-white/90">{env.appName} Wallet</p>
            </div>
            <Nfc className="h-6 w-6 text-white/80" />
          </div>
          <div className="mt-7 flex items-center gap-3">
            <span className="wallet-card-chip" />
            <WalletCards className="h-5 w-5 text-white/70" />
          </div>
          <p className="mt-6 font-mono text-lg tracking-[0.28em] text-white/95" dir="ltr">
            •••• •••• •••• {last4}
          </p>
          <div className="mt-auto flex items-end justify-between gap-4 pt-6">
            <div>
              <p className="text-[11px] text-white/60">حامل الكارت</p>
              <p className="mt-1 text-sm font-bold">{profile?.full_name || 'طالب'}</p>
            </div>
            <div className="text-left" dir="rtl">
              <p className="text-[11px] text-white/60">الرصيد المتاح</p>
              <p className="mt-1 text-3xl font-black">{formatMoney(wallet?.balance ?? 0)}</p>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={onDeposit} className="neuro-raised-sm space-y-4 rounded-[2rem] p-6" noValidate>
        <h2 className="neuro-text text-xl font-bold">شحن المحفظة</h2>
        <p className="neuro-text-muted text-sm leading-7">اختار طريقة التحويل، حوّل على الرقم الظاهر، بعدين اكتب المبلغ وارفع الإيصال.</p>
        {methods.length ? (
          <label className="block space-y-2">
            <span className="neuro-text text-sm font-semibold">طريقة الدفع</span>
            <select
              className="neuro-input w-full rounded-2xl px-4 py-3"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
            >
              {methods.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="neuro-text-muted text-sm">مفيش طرق دفع مفعّلة دلوقتي.</p>
        )}
        {selected?.account ? (
          <div className="neuro-pressed flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
            <p className="text-sm">
              حوّل على <span className="font-bold">{selected.name}</span>:{' '}
              <span dir="ltr">{selected.account}</span>
            </p>
            <button
              type="button"
              className="neuro-raised-xs neuro-hover flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
              aria-label={copied ? 'تم النسخ' : 'نسخ الرقم'}
              title={copied ? 'تم النسخ' : 'نسخ الرقم'}
              onClick={() => void copyAccount(selected.account)}
            >
              {copied ? <Check className="h-4 w-4 neuro-accent" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        ) : selected ? (
          <p className="neuro-text-muted text-sm">الأدمن لسه ما حددش رقم {selected.name}.</p>
        ) : null}
        <Input label="المبلغ" value={amount} onChange={(event) => setAmount(event.target.value)} ltr />
        <label className="block space-y-2">
          <span className="neuro-text text-sm font-semibold">إيصال الدفع</span>
          <span className="receipt-drop neuro-hover relative flex min-h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[1.6rem] px-4 py-6 text-center">
            <input
              className="absolute inset-0 cursor-pointer opacity-0"
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            {preview ? (
              <img src={preview} alt="إيصال الدفع" className="max-h-52 w-full rounded-2xl object-contain" />
            ) : (
              <>
                <span className="neuro-accent-soft mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
                  <ImagePlus className="h-5 w-5" />
                </span>
                <p className="font-bold">ارفع صورة الإيصال</p>
                <p className="neuro-text-muted mt-1 text-sm">اضغط هنا لاختيار الصورة من جهازك</p>
              </>
            )}
          </span>
          {file ? <p className="neuro-text-muted text-xs">{file.name}</p> : null}
        </label>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <Button type="submit" disabled={submitState.isLoading}>
          {submitState.isLoading ? 'بيبعت...' : 'إرسال طلب الشحن'}
        </Button>
      </form>

      <section className="space-y-3">
        <h2 className="neuro-text text-xl font-bold">اشتراكاتي</h2>
        {subs.length === 0 ? <p className="neuro-text-muted">لسه مفيش اشتراك ساري.</p> : null}
        {subs.map((item) => {
          const course = firstRelation(item.courses)
          const plan = firstRelation(item.subscription_plans)
          return (
            <article key={item.id} className="neuro-raised-sm rounded-3xl p-4">
              <p className="font-bold">{course?.title ?? 'كورس'}</p>
              <p className="neuro-text-muted text-sm">
                {plan?.name ?? 'خطة'} — {plan ? planTypeLabel(plan.type) : ''} — {subscriptionStatusLabel(item.status)} — {item.ends_at ? `لحد ${formatDate(item.ends_at)}` : 'مدى الحياة'}
              </p>
            </article>
          )
        })}
      </section>

      <section className="space-y-3">
        <h2 className="neuro-text text-xl font-bold">حركة المحفظة</h2>
        {(wallet?.items ?? []).length === 0 ? <p className="neuro-text-muted">مفيش حركات لسه.</p> : null}
        {wallet?.items.map((item) => (
          <article key={item.id} className="neuro-raised-sm rounded-3xl p-4">
            <p className="font-bold">
              {item.amount > 0 ? '+' : ''}
              {formatMoney(item.amount)} — {walletTypeLabel(item.type)}
            </p>
            <p className="neuro-text-muted text-sm">{item.description}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="neuro-text text-xl font-bold">طلبات التحويل</h2>
        {payments.length === 0 ? <p className="neuro-text-muted">مفيش تحويلات.</p> : null}
        {payments.map((item) => (
          <article key={item.id} className="neuro-pressed rounded-3xl p-4">
            <p className="font-bold">
              {formatMoney(item.amount)} — {paymentKindLabel(item.kind)}
            </p>
            <p className="neuro-text-muted text-sm">{paymentStatusLabel(item.status)}</p>
          </article>
        ))}
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="تأكيد شحن المحفظة"
        text={`هيتبعت طلب شحن بقيمة ${formatMoney(value || 0)} مع صورة الإيصال. الرصيد مش هيزيد غير بعد مراجعة الأدمن.`}
        confirmLabel="تأكيد الإرسال"
        busy={submitState.isLoading}
        onClose={() => {
          if (!submitState.isLoading) setConfirmOpen(false)
        }}
        onConfirm={() => {
          void sendDeposit()
        }}
      />
      <ConfirmDialog
        open={successOpen}
        title="تم الإرسال بنجاح"
        text="طلب الإيداع اتبعت، وفي انتظار مراجعة الأدمن."
        confirmLabel="تمام"
        showCancel={false}
        onClose={() => setSuccessOpen(false)}
        onConfirm={() => setSuccessOpen(false)}
      />
    </div>
  )
}
