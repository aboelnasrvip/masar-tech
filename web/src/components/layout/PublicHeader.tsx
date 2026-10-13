import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { Button } from '@/components/ui/Button'
import { cx } from '@/lib/cx'
import { useAppSelector } from '@/store/hooks'

const links = [
  { href: '/#instructor', label: 'المدرّس' },
  { href: '/#why', label: 'ليه Go Tech' },
  { href: '/#how', label: 'إزاي بتشتغل' },
  { href: '/#courses', label: 'الكورسات' },
  { href: '/#pricing', label: 'الاشتراك' },
  { href: '/#faq', label: 'أسئلة' },
]

export function PublicHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const isHome = location.pathname === '/'
  const user = useAppSelector((state) => state.auth.user)

  return (
    <header className={cx(isHome ? 'fixed top-0 z-50 w-full' : 'sticky top-0 z-40 w-full')}>
      <div className="neuro-raised flex w-full items-center justify-between rounded-none px-3 py-3 lg:px-5">
        <Logo />

        <nav className="neuro-text-muted hidden items-center gap-6 text-sm font-medium md:flex">
          {links.map((link) => (
            <a key={link.href} href={isHome ? link.href.slice(1) : link.href} className="hover:neuro-text">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {user ? (
            <Link to="/learn">
              <Button>مساحة التعلم</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="raised">دخول</Button>
              </Link>
              <Link to="/register">
                <Button>أنشئ حسابك</Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="neuro-raised-xs flex h-11 w-11 items-center justify-center rounded-2xl"
            onClick={() => setOpen((value) => !value)}
            aria-label="القائمة"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="neuro-raised w-full space-y-4 rounded-none p-5 md:hidden">
          {links.map((link) => (
            <a
              key={link.href}
              href={isHome ? link.href.slice(1) : link.href}
              className="neuro-text block py-2"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex gap-3">
            {user ? (
              <Link to="/learn" className="flex-1" onClick={() => setOpen(false)}>
                <Button className="w-full">مساحة التعلم</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
                  <Button variant="raised" className="w-full">
                    دخول
                  </Button>
                </Link>
                <Link to="/register" className="flex-1" onClick={() => setOpen(false)}>
                  <Button className="w-full">إنشاء حساب</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}
