import { Link } from 'react-router-dom'
import { Bell, BookOpen, Radio, TrendingUp, Wallet } from 'lucide-react'
import {
  firstRelation,
  formatDateTime,
  formatMoney,
  gradeLabel,
  paymentStatusLabel,
  sessionVisibleToGrade,
} from '@/lib/labels'
import { env } from '@/lib/env'
import { useAppSelector } from '@/store/hooks'
import {
  useGetMySubscriptionsQuery,
  useGetNotificationsQuery,
  useGetPaymentsQuery,
  useGetProgressQuery,
  useGetPublishedCoursesQuery,
  useGetSessionsQuery,
  useGetWalletQuery,
} from '@/store/api/studentApi'

export function LearnPage() {
  const profile = useAppSelector((state) => state.auth.profile)
  const { data: courses = [] } = useGetPublishedCoursesQuery()
  const { data: subs = [] } = useGetMySubscriptionsQuery()
  const { data: progress = [] } = useGetProgressQuery()
  const { data: wallet } = useGetWalletQuery()
  const { data: notifications = [] } = useGetNotificationsQuery(undefined, { pollingInterval: 15000 })
  const { data: sessions = [] } = useGetSessionsQuery()
  const { data: payments = [] } = useGetPaymentsQuery()

  const owned = new Set(subs.map((item) => item.course_id))
  const myCourses = courses.filter((course) => owned.has(course.id))
  const done = progress.filter((item) => item.lesson_completed).length
  const unread = notifications.filter((item) => !item.is_read)
  const pendingPayments = payments.filter((item) => item.status === 'pending')
  const myLives = sessions.filter((session) => sessionVisibleToGrade(session.grade, profile?.grade))
  const now = Date.now()
  const upcomingLive = [...myLives]
    .filter((session) => new Date(session.starts_at).getTime() > now - 3 * 60 * 60 * 1000)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0]
  const lastLesson = [...progress].sort((a, b) => {
    const aTime = new Date(a.updated_at ?? a.completed_at ?? 0).getTime()
    const bTime = new Date(b.updated_at ?? b.completed_at ?? 0).getTime()
    return bTime - aTime
  })[0]
  const lastTitle = firstRelation(lastLesson?.lessons)?.title

  const stats = [
    { to: '/courses', label: 'كورساتي', value: String(myCourses.length), icon: BookOpen },
    { to: '/progress', label: 'دروس مكتملة', value: String(done), icon: TrendingUp },
    { to: '/wallet', label: 'المحفظة', value: formatMoney(wallet?.balance ?? 0), icon: Wallet },
    { to: '/notifications', label: 'إشعارات جديدة', value: String(unread.length), icon: Bell },
  ]

  return (
    <div className="space-y-5">
      <section className="neuro-raised rounded-[1.75rem] p-6">
        <p className="neuro-text-muted text-sm">{env.appName}</p>
        <h1 className="neuro-text mt-1 text-3xl font-extrabold">أهلاً {profile?.full_name || 'طالب'}</h1>
        <p className="neuro-text-muted mt-2 leading-7">
          نظرة عامة على حسابك
          {profile?.grade ? ` — ${gradeLabel(profile.grade)}` : ''}. كمّل من آخر درس، شوف اللايف، وتابع الإشعارات والمدفوعات من هنا.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((item) => (
          <Link key={item.to} to={item.to} className="neuro-raised-sm neuro-hover flex min-w-0 items-center gap-2.5 rounded-3xl p-4">
            <span className="neuro-accent-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
              <item.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <p className="neuro-text-muted text-sm">{item.label}</p>
              <p className="neuro-text truncate text-xl font-extrabold">{item.value}</p>
            </span>
          </Link>
        ))}
      </div>

      {lastLesson ? (
        <Link to={`/lessons/${lastLesson.lesson_id}`} className="neuro-pressed neuro-hover block rounded-3xl p-5">
          <p className="neuro-accent text-sm font-bold">كمّل من حيث وقفت</p>
          <h2 className="neuro-text mt-1 text-xl font-extrabold">{lastTitle ?? 'آخر درس'}</h2>
          <p className="neuro-text-muted mt-2 text-sm">
            {lastLesson.lesson_completed ? 'الدرس مكتمل — تقدر تراجعه.' : 'ادخل الدرس وكمّل الفيديو أو الواجب.'}
          </p>
        </Link>
      ) : (
        <Link to="/courses" className="neuro-pressed neuro-hover block rounded-3xl p-5">
          <p className="neuro-accent text-sm font-bold">ابدأ التعلم</p>
          <h2 className="neuro-text mt-1 text-xl font-extrabold">لسه ما دخلتش أي درس</h2>
          <p className="neuro-text-muted mt-2 text-sm">اختار كورس من كورساتك وابدأ أول درس.</p>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="neuro-raised-sm space-y-3 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="neuro-text font-extrabold">أقرب لايف</h2>
            <Link to="/live" className="text-sm neuro-accent">
              كل المحاضرات
            </Link>
          </div>
          {upcomingLive ? (
            <article className="neuro-pressed rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 neuro-accent" />
                <h3 className="font-bold">{upcomingLive.title}</h3>
              </div>
              <p className="neuro-text-muted mt-2 text-sm">{formatDateTime(upcomingLive.starts_at)}</p>
              {upcomingLive.join_url ? (
                <a href={upcomingLive.join_url} className="mt-3 inline-block text-sm neuro-accent" target="_blank" rel="noreferrer">
                  انضمام
                </a>
              ) : null}
            </article>
          ) : (
            <p className="neuro-text-muted text-sm">مفيش محاضرة قريبة لصفك دلوقتي.</p>
          )}
        </section>

        <section className="neuro-raised-sm space-y-3 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="neuro-text font-extrabold">آخر الإشعارات</h2>
            <Link to="/notifications" className="text-sm neuro-accent">
              الكل
            </Link>
          </div>
          {unread.slice(0, 3).map((item) => (
            <article key={item.id} className="neuro-pressed rounded-2xl p-4">
              <p className="font-bold">{item.title}</p>
              <p className="neuro-text-muted mt-1 line-clamp-2 text-sm">{item.body}</p>
            </article>
          ))}
          {unread.length === 0 ? <p className="neuro-text-muted text-sm">مفيش إشعارات جديدة.</p> : null}
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="neuro-text text-xl font-extrabold">كورساتي</h2>
          <Link to="/courses" className="text-sm neuro-accent">
            تصفح الكل
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {myCourses.map((course) => (
            <Link key={course.id} to={`/courses/${course.slug}`} className="neuro-raised-sm neuro-hover rounded-3xl p-5">
              <p className="text-sm neuro-accent">{gradeLabel(course.grade)}</p>
              <h3 className="neuro-text mt-1 text-lg font-extrabold">{course.title}</h3>
              <p className="neuro-text-muted mt-2 line-clamp-2 text-sm">{course.description}</p>
            </Link>
          ))}
        </div>
        {myCourses.length === 0 ? (
          <Link to="/courses" className="neuro-pressed block rounded-3xl p-5">
            <p className="font-bold">لسه مفيش اشتراك ساري</p>
            <p className="neuro-text-muted mt-2 text-sm">ادخل الكورسات واشترِ شهر أو الترم كامل.</p>
          </Link>
        ) : null}
      </section>

      {pendingPayments.length > 0 ? (
        <section className="neuro-warning-soft space-y-2 rounded-3xl p-5">
          <h2 className="font-extrabold">مدفوعات قيد المراجعة</h2>
          {pendingPayments.slice(0, 3).map((item) => (
            <p key={item.id} className="text-sm">
              {formatMoney(item.amount)} — {paymentStatusLabel(item.status)}
            </p>
          ))}
          <Link to="/wallet" className="inline-block text-sm font-bold">
            فتح المحفظة
          </Link>
        </section>
      ) : null}
    </div>
  )
}
