import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Bell, BookOpen, ClipboardList, Home, Radio, TrendingUp, User, Wallet } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { cx } from '@/lib/cx'
import { env } from '@/lib/env'
import { copiedTextFromDetail, useLessonSecurity, type SecurityEventType } from '@/lib/lesson-security'
import { useGetNotificationsQuery, useGetSessionsQuery, useReportSecurityEventMutation } from '@/store/api/studentApi'
import { useAppSelector } from '@/store/hooks'

const links = [
  { to: '/learn', label: 'الرئيسية', icon: Home, end: true },
  { to: '/courses', label: 'كورساتي', icon: BookOpen },
  { to: '/exams', label: 'الامتحانات', icon: ClipboardList },
  // { to: '/community', label: 'المجتمع', icon: MessageSquare },
  { to: '/progress', label: 'التقدم', icon: TrendingUp },
  { to: '/wallet', label: 'المدفوعات', icon: Wallet },
  { to: '/account', label: 'حسابي', icon: User },
]

export function StudentLayout() {
  const user = useAppSelector((state) => state.auth.user)
  const profile = useAppSelector((state) => state.auth.profile)
  const location = useLocation()
  const lessonId = location.pathname.match(/\/lessons\/([^/?#]+)/)?.[1] ?? null
  const [reportSecurity] = useReportSecurityEventMutation()
  const lastEvent = useRef<Record<string, number>>({})
  const { data: notifications = [] } = useGetNotificationsQuery(undefined, { pollingInterval: 10000 })
  const { data: sessions = [] } = useGetSessionsQuery(undefined, { pollingInterval: 30000 })
  const unread = notifications.filter((item) => !item.is_read).length
  const liveNow = sessions.some((session) => {
    const start = new Date(session.starts_at).getTime()
    if (Number.isNaN(start)) return false
    const now = Date.now()
    return now >= start && now < start + 3 * 60 * 60 * 1000
  })

  function reportSecurityEvent(eventType: SecurityEventType, detail?: string) {
    if (!user) return
    const now = Date.now()
    const copyText = eventType === 'copy' ? copiedTextFromDetail(detail) : ''
    const key = eventType === 'copy' ? `copy:${copyText}` : `${eventType}:${lessonId ?? location.pathname}`
    const wait =
      eventType === 'copy'
        ? 500
        : eventType === 'shortcut_inspect' || eventType === 'contextmenu'
          ? 800
          : eventType === 'tab_hidden' || eventType === 'tab_visible'
            ? 1500
            : 4000
    if (now - (lastEvent.current[key] ?? 0) < wait) return
    lastEvent.current[key] = now
    void reportSecurity({
      student_id: user.id,
      lesson_id: lessonId,
      event_type: eventType,
      detail,
    })
  }

  useLessonSecurity(Boolean(user), reportSecurityEvent, lessonId)

  useEffect(() => {
    const node = document.getElementById('platform-scroll')
    if (node) node.scrollTop = 0
  }, [location.pathname])

  return (
    <div className="h-svh overflow-hidden xl:grid xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-4 xl:p-4">
      <aside className="neuro-pressed hidden h-full min-h-0 overflow-y-auto rounded-4xl p-5 xl:block">
        <Logo to="/learn" />
        <nav className="mt-6 space-y-2">
          {links.map((item) => (
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
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex h-full min-h-0 flex-col p-4 pb-23 xl:p-0">
        <header className="neuro-raised mb-4 flex shrink-0 items-center justify-between rounded-3xl px-4 py-3 xl:px-5 xl:py-4">
          <div className="xl:hidden">
            <Logo to="/learn" compact />
          </div>
          <div className="hidden xl:block">
            <p className="neuro-text-muted text-sm">{env.appName}</p>
            <h2 className="neuro-text text-xl font-extrabold">{profile?.full_name || 'مساحة التعلم'}</h2>
          </div>
          <p className="neuro-text max-w-[36%] truncate text-sm font-bold xl:hidden">{profile?.full_name || env.appName}</p>
          <div className="flex items-center gap-1.5">
            <NavLink
              to="/live"
              aria-label="المحاضرات اللايف"
              className={({ isActive }) =>
                cx(
                  'relative flex h-11 w-11 items-center justify-center rounded-2xl',
                  isActive ? 'neuro-active' : 'neuro-raised-xs',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Radio className={cx('h-5 w-5', !isActive && (liveNow ? 'neuro-accent' : 'neuro-text-muted'))} />
                  {liveNow ? <span className="absolute top-2.5 left-2.5 h-2 w-2 rounded-full bg-red-500" /> : null}
                </>
              )}
            </NavLink>
            <NavLink
              to="/notifications"
              aria-label={unread > 0 ? `${unread} إشعارات غير مقروءة` : 'الإشعارات'}
              className={({ isActive }) =>
                cx(
                  'relative flex h-11 w-11 items-center justify-center rounded-2xl',
                  isActive ? 'neuro-active' : 'neuro-raised-xs',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Bell
                    className={cx('h-5 w-5', !isActive && (unread > 0 ? 'neuro-accent' : 'neuro-text-muted'))}
                    fill={!isActive && unread > 0 ? 'currentColor' : 'none'}
                  />
                  {unread > 0 ? (
                    <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--neuro-accent)] px-1 text-[9px] font-bold text-[var(--neuro-on-accent)]">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
            <ThemeToggle />
          </div>
        </header>
        <div id="platform-scroll" className="neuro-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-6xl pb-4">
            <Outlet />
          </div>
        </div>
      </main>

      <nav className="neuro-raised fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 px-1 pt-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] xl:hidden">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cx(
                'relative flex flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1 text-[10px] leading-none',
                isActive ? 'neuro-accent font-bold' : 'neuro-text-muted',
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
