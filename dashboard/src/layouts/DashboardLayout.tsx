import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  ClipboardList,
  CreditCard,
  FileQuestion,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  Radio,
  Settings,
  ShieldAlert,
  Sun,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { signOut } from '@/store/slices/authSlice'
import { toggleTheme } from '@/store/slices/uiSlice'
import { cx } from '@/lib/cx'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'نظرة عامة', end: true },
  { to: '/students', icon: Users, label: 'الطلاب' },
  { to: '/courses', icon: BookOpen, label: 'الكورسات' },
  { to: '/assignments', icon: ClipboardList, label: 'الواجبات' },
  { to: '/exams', icon: FileQuestion, label: 'الامتحانات' },
  { to: '/messages', icon: MessageSquare, label: 'أسئلة الدروس' },
  { to: '/payments', icon: CreditCard, label: 'المدفوعات' },
  { to: '/wallet', icon: Wallet, label: 'المحفظة' },
  // { to: '/community', icon: MessageSquare, label: 'المجتمع' },
  { to: '/live', icon: Radio, label: 'اللايف' },
  { to: '/notifications', icon: Bell, label: 'الإشعارات' },
  { to: '/security', icon: ShieldAlert, label: 'أحداث الحماية' },
  { to: '/settings', icon: Settings, label: 'الإعدادات' },
]

export function DashboardLayout() {
  const dispatch = useAppDispatch()
  const profile = useAppSelector((state) => state.auth.profile)
  const theme = useAppSelector((state) => state.ui.theme)
  const location = useLocation()

  useEffect(() => {
    const node = document.getElementById('dashboard-scroll')
    if (node) node.scrollTop = 0
  }, [location.pathname])

  return (
    <div className="h-svh overflow-hidden lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-4 lg:p-4">
      <aside className="neuro-pressed hidden h-full min-h-0 overflow-y-auto rounded-[2rem] p-5 lg:block">
        <h1 className="neuro-text mb-6 text-xl font-extrabold tracking-tight" dir="ltr">
          Go Tech
        </h1>
        <nav className="space-y-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm',
                  isActive ? 'neuro-active' : 'neuro-text-muted',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex h-full min-h-0 flex-col p-4 lg:p-0">
        <header className="neuro-raised mb-4 flex shrink-0 items-center justify-between rounded-3xl px-5 py-4">
          <div>
            <p className="neuro-text-muted text-sm">لوحة التحكم</p>
            <h2 className="neuro-text text-xl font-extrabold">{profile?.full_name || 'أدمن'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => dispatch(toggleTheme())}
              className="neuro-raised-xs flex h-11 w-11 items-center justify-center rounded-2xl"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 neuro-accent" /> : <Moon className="h-5 w-5 neuro-accent" />}
            </button>
            <Button variant="raised" onClick={() => void dispatch(signOut())}>
              <LogOut className="h-4 w-4" />
              خروج
            </Button>
          </div>
        </header>
        <div className="mb-4 flex shrink-0 gap-2 overflow-x-auto lg:hidden">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx('shrink-0 rounded-2xl px-3 py-2 text-xs', isActive ? 'neuro-active' : 'neuro-raised-xs')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <div id="dashboard-scroll" className="neuro-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
