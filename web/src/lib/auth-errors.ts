export function toArabicAuthError(message: string) {
  const value = message.toLowerCase()

  if (message === 'SUPABASE_NOT_CONFIGURED') {
    return 'لسه مفيش اتصال بـ Supabase. حط رابط المشروع والمفتاح العام في ملف .env'
  }

  if (message === 'PHONE_ALREADY_REGISTERED' || value.includes('phone_already_registered')) {
    return 'رقم التليفون ده مسجّل قبل كده. سجّل دخول أو استخدم رقم تاني'
  }

  if (message === 'EMAIL_ALREADY_REGISTERED' || value.includes('email_already_registered')) {
    return 'الإيميل ده مسجّل قبل كده. سجّل دخول أو اطلب رابط تأكيد جديد'
  }

  if (value.includes('invalid login') || value.includes('invalid credentials')) {
    return 'الإيميل أو رقم التليفون أو كلمة السر غير صحيحة'
  }

  if (value.includes('email not confirmed')) {
    return 'أكّد إيميلك الأول من الرابط اللي وصلك'
  }

  if (value.includes('already registered') || value.includes('already been registered')) {
    return 'الإيميل ده مسجّل قبل كده. جرّب تسجّل دخول أو اطلب رابط تأكيد جديد'
  }

  if (value.includes('profiles_phone') || value.includes('database error saving new user')) {
    return 'رقم التليفون أو الإيميل مستخدم قبل كده. سجّل دخول أو غيّر الرقم'
  }

  if (value.includes('user not found') || value.includes('phone not found')) {
    return 'مفيش حساب مرتبط بالبيانات دي'
  }

  if (value.includes('password')) {
    return 'كلمة السر ضعيفة. استخدم 8 حروف على الأقل وفيها أرقام'
  }

  return 'حصل خطأ غير متوقع. جرّب تاني بعد شوية'
}
