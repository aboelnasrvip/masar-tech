export function paymentStatusLabel(status: string) {
  if (status === 'pending') return 'قيد المراجعة'
  if (status === 'approved') return 'معتمد'
  if (status === 'rejected') return 'مرفوض'
  if (status === 'cancelled') return 'ملغي'
  return status
}

export function paymentKindLabel(kind: string) {
  if (kind === 'wallet_deposit') return 'شحن محفظة'
  return 'شراء اشتراك'
}

export function planTypeLabel(type: string) {
  if (type === 'monthly') return 'شهري'
  if (type === 'full_term') return 'ترم كامل'
  return type
}

export function walletTypeLabel(type: string) {
  if (type === 'deposit') return 'شحن'
  if (type === 'course_purchase') return 'شراء كورس'
  if (type === 'refund') return 'استرجاع'
  if (type === 'adjustment') return 'تعديل رصيد'
  return type
}

export function subscriptionStatusLabel(status: string) {
  if (status === 'active') return 'ساري'
  if (status === 'expired') return 'منتهي'
  if (status === 'cancelled') return 'ملغي'
  return status
}

export function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export function formatMoney(value: number) {
  return `${Number(value).toLocaleString('ar-EG')} ج`
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function gradeLabel(value: string | null | undefined) {
  if (value === 'sec-2') return 'تانية بكالوريا'
  if (value === 'sec-1') return 'أولى ثانوي'
  return value ?? '—'
}

export function sessionVisibleToGrade(sessionGrade: string | null | undefined, studentGrade: string | null | undefined) {
  if (!sessionGrade) return true
  if (!studentGrade) return true
  return sessionGrade === studentGrade
}
