import type { PaymentMethod } from '@/types/models'

export const defaultPaymentMethods: PaymentMethod[] = [
  { id: 'vodafone_cash', name: 'فودافون كاش', account: '', enabled: true },
  { id: 'orange_cash', name: 'أورانج كاش', account: '', enabled: true },
  { id: 'we_cash', name: 'وي كاش', account: '', enabled: true },
  { id: 'etisalat_cash', name: 'اتصالات كاش', account: '', enabled: true },
  { id: 'instapay', name: 'إنستاباي', account: '', enabled: true },
]

export function createPaymentMethod(name: string, account = '', enabled = true): PaymentMethod {
  const trimmed = name.trim()
  return {
    id: `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed || 'طريقة دفع',
    account: account.trim(),
    enabled,
  }
}

export function mergePaymentMethods(current: PaymentMethod[] | null | undefined): PaymentMethod[] {
  if (!Array.isArray(current)) return defaultPaymentMethods.map((item) => ({ ...item }))
  return current
    .filter((item): item is PaymentMethod => Boolean(item) && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id || `method_${index}`).trim() || `method_${index}`,
      name: String(item.name || 'طريقة دفع').trim() || 'طريقة دفع',
      account: String(item.account ?? ''),
      enabled: item.enabled !== false,
    }))
}
