import { Link } from 'react-router-dom'
import { CardGrid } from '@/components/ui/ConfirmDialog'
import { formatMoney, gradeLabel } from '@/lib/labels'
import { useAppSelector } from '@/store/hooks'
import { useGetMySubscriptionsQuery, useGetPublishedCoursesQuery } from '@/store/api/studentApi'

export function CatalogPage() {
  const profile = useAppSelector((state) => state.auth.profile)
  const { data: courses = [] } = useGetPublishedCoursesQuery()
  const { data: subs = [] } = useGetMySubscriptionsQuery()
  const owned = new Set(subs.map((item) => item.course_id))
  const visible = courses.filter((course) => !profile?.grade || !course.grade || course.grade === profile.grade)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="neuro-text text-3xl font-extrabold">الكورسات</h1>
        <p className="neuro-text-muted mt-2">
          كورسات {profile?.grade ? gradeLabel(profile.grade) : 'صفك'}. اختار كورس، ادخل الترم، واشترِ شهر أو الترم كامل.
        </p>
      </div>
      <CardGrid>
        {visible.map((course) => {
          const prices = (course.subscription_plans ?? []).filter((item) => item.is_active).map((item) => item.price)
          const min = prices.length ? Math.min(...prices) : null
          return (
            <Link key={course.id} to={`/courses/${course.slug}`} className="neuro-raised-sm neuro-hover flex h-full flex-col overflow-hidden rounded-3xl">
              {course.image_url ? (
                <img src={course.image_url} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="h-40 tone-course-bg" />
              )}
              <div className="flex flex-1 flex-col p-6">
                <p className="text-sm neuro-accent">{owned.has(course.id) ? 'مشترك' : gradeLabel(course.grade)}</p>
                <h2 className="neuro-text mt-2 text-2xl font-extrabold">{course.title}</h2>
                <p className="neuro-text-muted mt-3 flex-1 leading-7">{course.description}</p>
                <p className="mt-4 text-sm font-bold neuro-accent">{min != null ? `يبدأ من ${formatMoney(min)}` : 'شوف التيرمات جوه'}</p>
              </div>
            </Link>
          )
        })}
      </CardGrid>
      {visible.length === 0 ? (
        <p className="neuro-text-muted">لسه مفيش كورسات منشورة لصفك. الأدمن يقدر ينشر كورس من لوحة التحكم.</p>
      ) : null}
    </div>
  )
}
