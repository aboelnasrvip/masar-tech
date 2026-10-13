import { isEgMobile, isEmail } from './phone'

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
