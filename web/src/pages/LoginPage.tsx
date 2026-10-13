import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, Phone, UserRound } from 'lucide-react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { validateLogin } from '@/lib/register-validation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearAuthMessages, signIn } from '@/store/slices/authSlice'

export function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { status, error } = useAppSelector((state) => state.auth)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({})

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    dispatch(clearAuthMessages())
    const nextErrors = validateLogin(identifier, password)
    setFieldErrors(nextErrors)
    if (nextErrors.identifier || nextErrors.password) {
      return
    }
    const result = await dispatch(signIn({ identifier, password }))
    if (signIn.fulfilled.match(result)) {
      navigate('/learn')
    }
  }

  return (
    <div className="min-h-svh">
      <PublicHeader />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-2 lg:items-center">
        <div className="space-y-4">
          <h1 className="neuro-text text-4xl font-extrabold">تسجيل الدخول</h1>
          <p className="neuro-text-muted max-w-md leading-8">
            ادخل بالإيميل أو رقم تليفونك مع كلمة السر. من غير OTP.
          </p>
        </div>

        <form onSubmit={onSubmit} className="neuro-raised space-y-5 rounded-[2rem] p-6 md:p-8" noValidate>
          <Input
            label="الإيميل أو رقم التليفون"
            name="identifier"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="name@email.com أو 01000000000"
            icon={<Phone className="h-4 w-4" />}
            error={fieldErrors.identifier}
            ltr
          />
          <Input
            label="كلمة السر"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            icon={<KeyRound className="h-4 w-4" />}
            error={fieldErrors.password}
          />

          {error ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={status === 'loading'}>
            <UserRound className="h-4 w-4" />
            {status === 'loading' ? 'بيتم الدخول...' : 'دخول'}
          </Button>

          <p className="neuro-text-muted text-center text-sm">
            لسه معندكش حساب؟{' '}
            <Link to="/register" className="font-bold neuro-accent">
              أنشئ حسابك
            </Link>
          </p>
        </form>
      </main>
      <PublicFooter />
    </div>
  )
}
