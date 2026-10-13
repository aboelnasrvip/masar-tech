export function readAuthCallback() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)

  return {
    code: query.get('code') ?? hash.get('code'),
    error: hash.get('error') ?? query.get('error'),
    errorCode: hash.get('error_code') ?? query.get('error_code'),
    errorDescription: hash.get('error_description') ?? query.get('error_description'),
  }
}

export function toArabicConfirmError(errorCode: string | null, description: string | null) {
  const text = `${errorCode ?? ''} ${description ?? ''}`.toLowerCase()

  if (text.includes('otp_expired') || text.includes('expired') || text.includes('invalid')) {
    return 'رابط التأكيد انتهى أو اتستخدم قبل كده. ابعت رابط جديد من الصفحة دي.'
  }

  if (text.includes('access_denied')) {
    return 'التأكيد اترفض. جرّب تبعت الرابط تاني أو سجّل دخول لو الحساب اتفعّل.'
  }

  return 'مقدرناش نأكد الإيميل. ابعت الرابط تاني أو سجّل دخول.'
}
