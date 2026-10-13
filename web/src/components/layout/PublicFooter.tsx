import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export function PublicFooter() {
  return (
    <footer className="landing-pad pb-8">
      <div className="neuro-raised flex w-full flex-col gap-8 rounded-3xl px-4 py-8 md:flex-row md:items-center md:justify-between">
        <Logo />
        <div className="neuro-text-muted flex flex-wrap gap-5 text-sm">
          <a href="/#instructor">المدرّس</a>
          <a href="/#courses">الكورسات</a>
          <a href="/#how">طريقة التعلم</a>
          <Link to="/login">تسجيل الدخول</Link>
          <Link to="/register">إنشاء حساب</Link>
        </div>
        <p className="neuro-text-muted text-sm">© {new Date().getFullYear()} Go Tech — منصة عربية لتعلّم البرمجة</p>
      </div>
    </footer>
  )
}
