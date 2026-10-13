import { isEgMobile, isEmail, normalizeEgPhone } from './phone'

export type RegisterForm = {
  fullName: string
  email: string
  password: string
  phone: string
  parentPhone: string
  city: string
  governorate: string
  school: string
  educationalStage: string
  grade: string
}

export type FieldErrors = Partial<Record<keyof RegisterForm, string>>

export function validateRegisterForm(form: RegisterForm): FieldErrors {
  const errors: FieldErrors = {}
  const fullName = form.fullName.trim()
  const email = form.email.trim()
  const city = form.city.trim()
  const school = form.school.trim()

  if (fullName.split(/\s+/).filter(Boolean).length < 4) {
    errors.fullName = 'اكتب الاسم رباعي (أربع أسماء)'
  }

  if (!isEmail(email)) {
    errors.email = 'اكتب إيميل صحيح. ده اللي بيتأكد.'
  }

  if (form.password.length < 8) {
    errors.password = 'كلمة السر لازم 8 حروف على الأقل'
  } else if (!/[A-Za-z\u0600-\u06FF]/.test(form.password) || !/\d/.test(form.password)) {
    errors.password = 'كلمة السر لازم فيها حروف وأرقام'
  }

  if (!isEgMobile(form.phone)) {
    errors.phone = 'رقم الطالب لازم يكون موبايل مصري صحيح (010 / 011 / 012 / 015)'
  }

  if (!isEgMobile(form.parentPhone)) {
    errors.parentPhone = 'رقم ولي الأمر لازم يكون موبايل مصري صحيح'
  } else if (normalizeEgPhone(form.phone) === normalizeEgPhone(form.parentPhone)) {
    errors.parentPhone = 'رقم ولي الأمر لازم يختلف عن رقم الطالب'
  }

  if (city.length < 2) {
    errors.city = 'اكتب اسم المدينة'
  }

  if (!form.governorate) {
    errors.governorate = 'اختار المحافظة'
  }

  if (school.length < 2) {
    errors.school = 'اكتب اسم المدرسة'
  }

  if (!form.educationalStage) {
    errors.educationalStage = 'اختار المرحلة'
  }

  if (!form.grade || !['sec-1', 'sec-2'].includes(form.grade)) {
    errors.grade = 'اختار أولى ثانوي أو تانية بكالوريا'
  }

  return errors
}

export function mapSignupErrorToFields(message: string): FieldErrors {
  const value = message.toLowerCase()

  if (
    value.includes('phone_already_registered') ||
    value.includes('profiles_phone') ||
    (value.includes('database error saving new user') && value.includes('phone'))
  ) {
    return { phone: 'رقم التليفون ده مسجّل قبل كده. سجّل دخول أو استخدم رقم تاني' }
  }

  if (
    value.includes('email_already_registered') ||
    value.includes('already registered') ||
    value.includes('already been registered')
  ) {
    return { email: 'الإيميل ده مسجّل قبل كده. سجّل دخول أو اطلب رابط تأكيد جديد' }
  }

  return {}
}

export function validateLogin(identifier: string, password: string) {
  const errors: { identifier?: string; password?: string } = {}
  const value = identifier.trim()

  if (!value) {
    errors.identifier = 'اكتب الإيميل أو رقم التليفون'
  } else if (!isEmail(value) && !isEgMobile(value)) {
    errors.identifier = 'اكتب إيميل صحيح أو رقم موبايل مصري'
  }

  if (!password) {
    errors.password = 'اكتب كلمة السر'
  } else if (password.length < 8) {
    errors.password = 'كلمة السر 8 حروف على الأقل'
  }

  return errors
}
