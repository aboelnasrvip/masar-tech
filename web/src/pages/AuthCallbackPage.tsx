import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { Button } from '@/components/ui/Button'
import { readAuthCallback, toArabicConfirmError } from '@/lib/auth-callback'
import { clearPendingEmail, getPendingEmail } from '@/lib/pending-email'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { initSession, resendConfirmation } from '@/store/slices/authSlice'

export function AuthCallbackPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('بنأكد الإيميل...')
  const email = getPendingEmail()

  useEffect(() => {
    async function finish() {
      const callback = readAuthCallback()

      if (callback.error) {
        setState('error')
        setMessage(toArabicConfirmError(callback.errorCode, callback.errorDescription))
        return
      }

      if (!isSupabaseConfigured()) {
        setState('error')
        setMessage('مفيش اتصال بـ Supabase.')
        return
      }

      const supabase = getSupabase()

      if (callback.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(callback.code)
        if (error) {
          setState('error')
          setMessage(toArabicConfirmError(error.name, error.message))
          return
        }
      }

      await dispatch(initSession())
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        clearPendingEmail()
        setState('success')
        setMessage('الإيميل اتأكد بنجاح. حسابك اتفعّل.')
        window.setTimeout(() => navigate('/learn'), 1200)
        return
      }

      setState('success')
      setMessage('لو ضغطت الرابط من الإيميل، الحساب غالبًا اتفعّل. سجّل دخول دلوقتي.')
    }

    void finish()
  }, [dispatch, navigate])

  return (
    <div className="min-h-svh">
      <PublicHeader />
      <main className="mx-auto max-w-xl px-4 py-20">
        <div className="neuro-raised rounded-[2rem] p-8 text-center">
          <span className="neuro-raised-xs mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
            {state === 'error' ? (
              <CircleAlert className="h-6 w-6 text-red-500" />
            ) : (
              <CircleCheck className="h-6 w-6 neuro-accent" />
            )}
          </span>
          <h1 className="neuro-text text-3xl font-extrabold">
            {state === 'loading' ? 'جاري التأكيد' : state === 'error' ? 'التأكيد فشل' : 'تم التأكيد'}
          </h1>
          <p className="neuro-text-muted mt-3 leading-8">{message}</p>

          <div className="mt-6 flex flex-col gap-3">
            {state === 'error' && email ? (
              <Button onClick={() => void dispatch(resendConfirmation(email))}>إعادة إرسال رابط التأكيد</Button>
            ) : null}
            <Link to={user ? '/learn' : '/login'}>
              <Button variant={state === 'error' ? 'raised' : 'primary'} className="w-full">
                {user ? 'الدخول للمنصة' : 'تسجيل الدخول'}
              </Button>
            </Link>
            <Link to="/confirm-email" className="text-sm neuro-accent">
              صفحة تعليمات التأكيد
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
