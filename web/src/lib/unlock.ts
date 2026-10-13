import type { Lesson, LessonLockReason, LessonProgress, StudentSubscription, SubscriptionPlan } from '@/types/models'
import { formatDateTime } from '@/lib/labels'

export function hasMonthAccess(
  subs: StudentSubscription[],
  courseId: string,
  termId: string | null | undefined,
  moduleId: string,
) {
  return subs.some((item) => {
    if (item.course_id !== courseId) return false
    if (item.module_id === moduleId) return true
    if (item.module_id == null && (item.term_id == null || item.term_id === termId)) return true
    return false
  })
}

export function hasTermAccess(subs: StudentSubscription[], courseId: string, termId: string) {
  return subs.some(
    (item) =>
      item.course_id === courseId &&
      item.module_id == null &&
      (item.term_id == null || item.term_id === termId),
  )
}

export function ownsPlan(
  subs: StudentSubscription[],
  plan: Pick<SubscriptionPlan, 'course_id' | 'type' | 'module_id' | 'term_id'>,
) {
  if (plan.type === 'full_term') {
    return Boolean(plan.term_id) && hasTermAccess(subs, plan.course_id, plan.term_id as string)
  }
  if (!plan.module_id) return false
  return hasMonthAccess(subs, plan.course_id, plan.term_id, plan.module_id)
}

export function termUpgradePricing(
  subs: StudentSubscription[],
  termPlan: Pick<SubscriptionPlan, 'price' | 'type' | 'course_id' | 'term_id'>,
  monthPlans: Array<Pick<SubscriptionPlan, 'module_id' | 'price'>> = [],
) {
  if (termPlan.type !== 'full_term' || !termPlan.term_id) {
    return { credit: 0, due: Number(termPlan.price), ownedMonthCount: 0 }
  }

  const monthByModule = new Map(
    monthPlans.filter((item) => item.module_id).map((item) => [item.module_id as string, Number(item.price)]),
  )
  const credited = new Map<string, number>()

  for (const item of subs) {
    if (item.course_id !== termPlan.course_id || !item.module_id) continue
    if (item.term_id && item.term_id !== termPlan.term_id) continue
    if (!item.term_id && monthByModule.size > 0 && !monthByModule.has(item.module_id)) continue
    const related = Array.isArray(item.subscription_plans) ? item.subscription_plans[0] : item.subscription_plans
    const price = monthByModule.get(item.module_id) ?? Number(related?.price ?? 0)
    if (!credited.has(item.module_id)) credited.set(item.module_id, price)
  }

  const credit = Math.min(
    [...credited.values()].reduce((sum, value) => sum + value, 0),
    Number(termPlan.price),
  )
  return { credit, due: Math.max(0, Number(termPlan.price) - credit), ownedMonthCount: credited.size }
}

export function lessonLockState(
  lesson: Lesson,
  moduleLessons: Lesson[],
  progressByLesson: Record<string, Pick<LessonProgress, 'assignment_completed' | 'lesson_completed'> | undefined>,
  requiredAssignmentByLesson: Record<string, boolean>,
): { unlocked: boolean; reason: LessonLockReason } {
  const now = Date.now()
  if (lesson.available_at && new Date(lesson.available_at).getTime() > now) {
    return { unlocked: false, reason: 'schedule' }
  }

  const prev = moduleLessons
    .filter((item) => item.order_index < lesson.order_index)
    .sort((a, b) => b.order_index - a.order_index)[0]

  if (!prev) return { unlocked: true, reason: null }

  const prevProgress = progressByLesson[prev.id]
  if (requiredAssignmentByLesson[prev.id]) {
    return prevProgress?.assignment_completed
      ? { unlocked: true, reason: null }
      : { unlocked: false, reason: 'assignment' }
  }

  return prevProgress?.lesson_completed
    ? { unlocked: true, reason: null }
    : { unlocked: false, reason: 'previous' }
}

export function lockLabel(reason: LessonLockReason, availableAt?: string | null) {
  if (reason === 'schedule') {
    if (availableAt && new Date(availableAt).getTime() > Date.now()) {
      return `ظاهر في القائمة، وهيتفتح ${formatDateTime(availableAt)}`
    }
    return 'ظاهر في القائمة، والأدمن لسه ما حددش ميعاد الفتح'
  }
  if (reason === 'assignment') return 'ظاهر، ومقفول لحد ما تسلّم واجب الدرس اللي قبله'
  if (reason === 'previous') return 'ظاهر، ومقفول لحد ما تخلّص الدرس اللي قبله'
  return ''
}
