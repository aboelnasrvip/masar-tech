import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { KeyRound, Moon, Phone, Shield, Sun } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { env } from '@/lib/env'
import { validateLogin } from '@/lib/login-validation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearAuthError, signIn } from '@/store/slices/authSlice'
import { toggleTheme } from '@/store/slices/uiSlice'

export function LoginPage() {
  const dispatch = useAppDispatch()
  const { status, user, error } = useAppSelector((state) => state.auth)
  const theme = useAppSelector((state) => state.ui.theme)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({})

  if (status === 'ready' && user) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    dispatch(clearAuthError())
    const nextErrors = validateLogin(identifier, password)
    setFieldErrors(nextErrors)
    if (nextErrors.identifier || nextErrors.password) {
      return
    }
    await dispatch(signIn({ identifier, password }))
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm neuro-accent">لوحة التحكم</p>
          <h1 className="neuro-text text-3xl font-extrabold">{env.appName}</h1>
        </div>
        <button
          type="button"
          onClick={() => dispatch(toggleTheme())}
          className="neuro-raised-xs flex h-11 w-11 items-center justify-center rounded-2xl"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5 neuro-accent" /> : <Moon className="h-5 w-5 neuro-accent" />}
        </button>
      </div>

      <form onSubmit={onSubmit} className="neuro-raised space-y-5 rounded-[2rem] p-6" noValidate>
        <Input
          label="الإيميل أو رقم التليفون"
          name="identifier"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
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
          icon={<KeyRound className="h-4 w-4" />}
          error={fieldErrors.password}
        />
        {error ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={status === 'loading'}>
          <Shield className="h-4 w-4" />
          {status === 'loading' ? 'بيتم التحقق...' : 'دخول الأدمن'}
        </Button>
      </form>
    </main>
  )
}
