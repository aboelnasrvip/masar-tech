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

export function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export function formatMoney(value: number) {
  return `${Number(value).toLocaleString('ar-EG')} ج`
}

export function securityEventLabel(type: string) {
  if (type === 'lesson_open') return 'فتح الدرس'
  if (type === 'shortcut_inspect') return 'اختصار Inspect'
  if (type === 'contextmenu') return 'كليك يمين'
  if (type === 'copy') return 'نسخ'
  if (type === 'print') return 'طباعة'
  if (type === 'tab_hidden') return 'ساب الصفحة'
  if (type === 'tab_visible') return 'رجع للصفحة'
  if (type === 'video_play') return 'تشغيل الفيديو'
  if (type === 'video_pause') return 'إيقاف الفيديو'
  if (type === 'video_seek') return 'تحريك الفيديو'
  if (type === 'video_fullscreen') return 'ملء الشاشة'
  if (type === 'video_mute') return 'كتم الصوت'
  if (type === 'devtools_open') return 'فتح أدوات المطوّر'
  return type
}

export type ParsedCopyDetail = {
  text: string
  method?: string
  page?: string
}

export function parseCopyDetail(detail: string | null | undefined): ParsedCopyDetail | null {
  if (!detail?.trim()) return null
  try {
    const parsed = JSON.parse(detail) as { text?: string; method?: string; page?: string }
    if (typeof parsed?.text === 'string') {
      return { text: parsed.text, method: parsed.method, page: parsed.page }
    }
  } catch {
    /* older rows stored Arabic sentences or event.type */
  }
  if (detail === 'copy' || detail === 'cut') return null
  const quoted = detail.match(/«([\s\S]*?)»/)
  if (quoted?.[1]?.trim()) {
    return { text: quoted[1].trim(), method: detail.includes('حافظ') ? 'من الحافظة' : 'من الصفحة' }
  }
  return { text: detail }
}

export function watermarkPositionLabel(position: string) {
  if (position === 'top-left') return 'أعلى يسار'
  if (position === 'top-right') return 'أعلى يمين'
  if (position === 'bottom-left') return 'أسفل يسار'
  if (position === 'bottom-right') return 'أسفل يمين'
  if (position === 'moving') return 'متحركة في أنحاء الفيديو'
  return position
}

export function gradeLabel(value: string | null | undefined) {
  if (value === 'sec-2') return 'تانية بكالوريا'
  if (value === 'sec-1') return 'أولى ثانوي'
  if (!value) return 'كل السنوات'
  return value
}
