export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

export function normalizeEgPhone(value: string) {
  const digits = digitsOnly(value)

  if (digits.startsWith('20') && digits.length >= 12) {
    return digits.slice(0, 12)
  }

  if (digits.startsWith('0') && digits.length === 11) {
    return `20${digits.slice(1)}`
  }

  if (digits.length === 10 && digits.startsWith('1')) {
    return `20${digits}`
  }

  return digits
}

export function isEgMobile(value: string) {
  const phone = normalizeEgPhone(value)
  return /^20(10|11|12|15)\d{8}$/.test(phone)
}

export function looksLikePhone(value: string) {
  const digits = digitsOnly(value)
  return digits.length >= 10 && !value.includes('@')
}
