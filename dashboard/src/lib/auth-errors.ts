export function toArabicAuthError(message: string) {
  const value = message.toLowerCase()

  if (message === 'SUPABASE_NOT_CONFIGURED') {
    return 'لسه مفيش اتصال بـ Supabase. حط رابط المشروع والمفتاح العام في ملف .env'
  }

  if (message === 'FORBIDDEN_ROLE') {
    return 'الحساب ده مش مسموح يدخل لوحة التحكم'
  }

  if (value.includes('invalid login') || value.includes('invalid credentials')) {
    return 'الإيميل أو رقم التليفون أو كلمة السر غير صحيحة'
  }

  if (value.includes('email not confirmed')) {
    return 'أكّد الإيميل الأول من الرابط اللي وصلك'
  }

  return 'حصل خطأ غير متوقع. جرّب تاني بعد شوية'
}
