import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { Button } from '@/components/ui/Button'
import { getPendingEmail } from '@/lib/pending-email'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { resendConfirmation } from '@/store/slices/authSlice'

export function ConfirmEmailPage() {
  const dispatch = useAppDispatch()
  const { status, error, info } = useAppSelector((state) => state.auth)
  const [params] = useSearchParams()
  const [sent, setSent] = useState(false)
  const email = useMemo(() => params.get('email') || getPendingEmail(), [params])

  return (
    <div className="min-h-svh">
      <PublicHeader />
      <main className="mx-auto max-w-xl px-4 py-16">
        <div className="neuro-raised rounded-[2rem] p-8 text-center">
          <span className="neuro-raised-xs mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
            <Mail className="h-6 w-6 neuro-accent" />
          </span>
          <h1 className="neuro-text text-3xl font-extrabold">أكد إيميلك</h1>
          <p className="neuro-text-muted mt-4 leading-8">
            بعتنالك رابط تفعيل
            {email ? (
              <>
                {' '}
                على <strong className="neuro-text">{email}</strong>
              </>
            ) : null}
            . افتح الإيميل واضغط الرابط عشان الحساب يتفعّل، وبعدين ارجع هنا وسجّل دخول.
          </p>
          <p className="neuro-text-muted mt-3 text-sm leading-7">
            لو اللينك قديم أو انتهى، اضغط «إعادة إرسال الرابط» واستخدم آخر إيميل وصلك.
          </p>

          {error ? <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p> : null}
          {info || sent ? (
            <p className="mt-4 rounded-2xl neuro-accent-soft px-4 py-3 text-sm">
              {info || 'الرابط اتبعت. راجع صندوق الوارد والـ Spam.'}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            <Button
              disabled={!email || status === 'loading'}
              onClick={() => {
                if (!email) return
                void dispatch(resendConfirmation(email)).then((result) => {
                  if (resendConfirmation.fulfilled.match(result)) setSent(true)
                })
              }}
            >
              {status === 'loading' ? 'بيبعت...' : 'إعادة إرسال الرابط'}
            </Button>
            <Link to="/login">
              <Button variant="raised" className="w-full">
                رجعت بعد التأكيد؟ سجّل دخول
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
