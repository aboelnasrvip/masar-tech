import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { governorates, grades } from '@/data/egypt'
import {
  mapSignupErrorToFields,
  validateRegisterForm,
  type FieldErrors,
  type RegisterForm,
} from '@/lib/register-validation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearAuthMessages, signUp } from '@/store/slices/authSlice'

const emptyForm: RegisterForm = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  parentPhone: '',
  city: '',
  governorate: governorates[0],
  school: '',
  educationalStage: 'secondary',
  grade: 'sec-1',
}

export function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { status, error } = useAppSelector((state) => state.auth)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof RegisterForm, boolean>>>({})

  function update<K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) {
    const next = { ...form, [key]: value }
    setForm(next)
    if (touched[key]) {
      setErrors(validateRegisterForm(next))
    }
  }

  function blur(key: keyof RegisterForm) {
    setTouched((current) => ({ ...current, [key]: true }))
    setErrors(validateRegisterForm(form))
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    dispatch(clearAuthMessages())

    const nextErrors = validateRegisterForm(form)
    setErrors(nextErrors)
    setTouched({
      fullName: true,
      email: true,
      password: true,
      phone: true,
      parentPhone: true,
      city: true,
      governorate: true,
      school: true,
      educationalStage: true,
      grade: true,
    })

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const result = await dispatch(signUp(form))

    if (signUp.fulfilled.match(result)) {
      navigate(`/confirm-email?email=${encodeURIComponent(form.email.trim())}`)
      return
    }

    if (signUp.rejected.match(result)) {
      setErrors((current) => ({
        ...current,
        ...mapSignupErrorToFields(result.error.message ?? ''),
      }))
    }
  }

  return (
    <div className="min-h-svh">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <h1 className="neuro-text text-4xl font-extrabold">إنشاء حساب طالب</h1>
          <p className="neuro-text-muted mt-3 max-w-2xl leading-8">
            الإيميل هو الأساس، وهيوصلك عليه رابط التأكيد. بعد التفعيل تدخل بالإيميل أو رقمك + كلمة السر.
          </p>
        </div>

        <form onSubmit={onSubmit} className="neuro-raised grid gap-5 rounded-[2rem] p-6 md:grid-cols-2 md:p-8" noValidate>
          <Input
            label="الاسم الرباعي"
            name="fullName"
            value={form.fullName}
            onChange={(event) => update('fullName', event.target.value)}
            onBlur={() => blur('fullName')}
            error={touched.fullName ? errors.fullName : undefined}
          />
          <Input
            label="الإيميل"
            name="email"
            type="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            onBlur={() => blur('email')}
            icon={<Mail className="h-4 w-4" />}
            hint="ده اللي بيتأكد، ومش هنقدر نفتح الحساب من غيره"
            error={touched.email ? errors.email : undefined}
            ltr
          />
          <Input
            label="كلمة السر"
            name="password"
            type="password"
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
            onBlur={() => blur('password')}
            hint="8 حروف على الأقل، حروف وأرقام"
            error={touched.password ? errors.password : undefined}
          />
          <Input
            label="رقم تليفون الطالب"
            name="phone"
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
            onBlur={() => blur('phone')}
            placeholder="01000000000"
            error={touched.phone ? errors.phone : undefined}
            ltr
          />
          <Input
            label="رقم ولي الأمر"
            name="parentPhone"
            value={form.parentPhone}
            onChange={(event) => update('parentPhone', event.target.value)}
            onBlur={() => blur('parentPhone')}
            error={touched.parentPhone ? errors.parentPhone : undefined}
            ltr
          />
          <Input
            label="المدينة"
            name="city"
            value={form.city}
            onChange={(event) => update('city', event.target.value)}
            onBlur={() => blur('city')}
            error={touched.city ? errors.city : undefined}
          />
          <Select
            label="المحافظة"
            name="governorate"
            value={form.governorate}
            onChange={(event) => update('governorate', event.target.value)}
            options={governorates.map((item) => ({ value: item, label: item }))}
            error={touched.governorate ? errors.governorate : undefined}
          />
          <Input
            label="المدرسة"
            name="school"
            value={form.school}
            onChange={(event) => update('school', event.target.value)}
            onBlur={() => blur('school')}
            error={touched.school ? errors.school : undefined}
          />
          <Select
            label="الصف الدراسي"
            name="grade"
            value={form.grade}
            onChange={(event) => update('grade', event.target.value)}
            options={grades}
            error={touched.grade ? errors.grade : undefined}
          />

          {error ? (
            <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-500 md:col-span-2">{error}</p>
          ) : null}

          <div className="md:col-span-2">
            <Button type="submit" className="w-full" disabled={status === 'loading'}>
              {status === 'loading' ? 'بيتم إنشاء الحساب...' : 'إنشاء الحساب'}
            </Button>
          </div>

          <p className="neuro-text-muted text-center text-sm md:col-span-2">
            عندك حساب؟{' '}
            <Link to="/login" className="font-bold neuro-accent">
              سجّل دخول
            </Link>
          </p>
        </form>
      </main>
      <PublicFooter />
    </div>
  )
}
