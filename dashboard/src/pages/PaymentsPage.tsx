import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatMoney, paymentKindLabel, paymentStatusLabel } from '@/lib/labels'
import { getSupabase } from '@/lib/supabase'
import { useGetPaymentsQuery, useReviewPaymentMutation } from '@/store/api/adminApi'
import type { Payment } from '@/types/models'

function relationName(value: { title?: string; name?: string } | { title?: string; name?: string }[] | undefined) {
  const item = Array.isArray(value) ? value[0] : value
  return item?.title ?? item?.name ?? '—'
}

export function PaymentsPage() {
  const { data = [], error, isLoading } = useGetPaymentsQuery(undefined, { pollingInterval: 10000 })
  const [review, reviewState] = useReviewPaymentMutation()
  const [selected, setSelected] = useState<Payment | null>(null)
  const [confirm, setConfirm] = useState<'approve' | 'reject' | null>(null)
  const [reviewError, setReviewError] = useState('')

  async function openProof(path: string | null) {
    if (!path) return
    const { data: signed } = await getSupabase().storage.from('payment-proofs').createSignedUrl(path, 1800)
    if (signed?.signedUrl) window.open(signed.signedUrl, '_blank')
  }

  async function applyReview(approve: boolean) {
    if (!selected) return
    setReviewError('')
    const result = await review({ id: selected.id, approve })
    if ('error' in result) {
      setReviewError('فشل تغيير الحالة. لو الطلب اتعتمد قبل كده مش هيتكرر.')
      return
    }
    setConfirm(null)
    setSelected(null)
  }

  return (
    <div className="space-y-4">
      <p className="neuro-text-muted text-sm leading-7">
        الصفحة بتتحدث كل 10 ثواني. اعتماد شراء كورس يفعّل الاشتراك. الرصيد يزيد في طلبات الشحن أو لو التحويل أكبر من سعر الخطة.
      </p>
      {isLoading ? <p className="neuro-text-muted">جاري التحميل...</p> : null}
      {error ? <p className="text-sm text-red-500">تعذر تحميل المدفوعات.</p> : null}
      {reviewError ? <p className="text-sm text-red-500">{reviewError}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((payment) => (
          <button
            key={payment.id}
            type="button"
            className="neuro-raised-sm neuro-hover rounded-3xl p-5 text-right"
            onClick={() => setSelected(payment)}
          >
            <p className="text-sm neuro-accent">{paymentStatusLabel(payment.status)}</p>
            <h3 className="neuro-text mt-1 text-lg font-bold">{payment.profiles?.full_name ?? 'طالب'}</h3>
            <p className="mt-2 text-xl font-extrabold neuro-accent">{formatMoney(payment.amount)}</p>
            <p className="neuro-text-muted mt-2 text-sm">
              {paymentKindLabel(payment.kind)} — {relationName(payment.courses)}
            </p>
          </button>
        ))}
      </div>
      {!isLoading && data.length === 0 ? <p className="neuro-text-muted">مفيش تحويلات.</p> : null}

      <Modal open={Boolean(selected)} title="تفاصيل التحويل" onClose={() => { setSelected(null); setConfirm(null) }}>
        {selected ? (
          <div className="space-y-3">
            <p><strong>الطالب:</strong> {selected.profiles?.full_name} — {selected.profiles?.phone}</p>
            <p><strong>المبلغ:</strong> {formatMoney(selected.amount)}</p>
            <p><strong>النوع:</strong> {paymentKindLabel(selected.kind)}</p>
            <p><strong>الحالة:</strong> {paymentStatusLabel(selected.status)}</p>
            <p><strong>الكورس:</strong> {relationName(selected.courses)}</p>
            <p><strong>الخطة:</strong> {relationName(selected.subscription_plans)}</p>
            <p><strong>الطريقة:</strong> {selected.method}</p>
            <p><strong>رقم العملية:</strong> {selected.reference}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="raised" onClick={() => void openProof(selected.screenshot_path)}>
                الإيصال
              </Button>
              {selected.status === 'pending' ? (
                <>
                  <Button onClick={() => setConfirm('approve')}>اعتماد</Button>
                  <Button variant="ghost" onClick={() => setConfirm('reject')}>
                    رفض
                  </Button>
                </>
              ) : null}
            </div>
            {confirm ? (
              <div className="neuro-pressed space-y-3 rounded-2xl p-4">
                <p className="font-semibold">
                  {confirm === 'approve' ? 'تأكيد اعتماد التحويل؟' : 'تأكيد رفض التحويل؟'}
                </p>
                <div className="flex gap-2">
                  <Button disabled={reviewState.isLoading} onClick={() => void applyReview(confirm === 'approve')}>
                    تأكيد
                  </Button>
                  <Button variant="raised" onClick={() => setConfirm(null)}>
                    رجوع
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
