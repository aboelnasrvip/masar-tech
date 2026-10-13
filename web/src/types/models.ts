export type CourseStatus = 'draft' | 'published' | 'archived'
export type PlanType = 'monthly' | 'full_term'
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type Course = {
  id: string
  title: string
  slug: string
  description: string | null
  image_url: string | null
  subject: string | null
  educational_stage: string | null
  grade: string | null
  academic_year: string | null
  status: CourseStatus
  subscription_plans?: Array<{
    id: string
    name: string
    type: PlanType
    price: number
    is_active: boolean
  }>
}

export type CourseModule = {
  id: string
  course_id: string
  term_id?: string | null
  title: string
  description: string | null
  order_index: number
  is_published: boolean
  price?: number
}

export type CourseTerm = {
  id: string
  course_id: string
  title: string
  description: string | null
  image_url: string | null
  price: number
  order_index: number
  is_published: boolean
}

export type Lesson = {
  id: string
  module_id: string
  title: string
  slug: string
  description: string | null
  order_index: number
  is_published: boolean
  video_provider: string | null
  video_id: string | null
  video_title: string | null
  video_thumbnail: string | null
  upload_method: 'api' | 'manual' | null
  video_visible: boolean
  pdf_visible: boolean
  editor_visible: boolean
  assignment_visible: boolean
  available_at?: string | null
}

export type LessonResource = {
  id: string
  lesson_id: string
  title: string
  file_path: string
  file_type: string
}

export type EditorBlock = {
  lesson_id: string
  html: string
  css: string
  js: string
}

export type Assignment = {
  id: string
  lesson_id: string
  title: string
  description: string | null
  passing_score: number | null
  max_attempts: number | null
  is_required: boolean
  is_published: boolean
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'code_output'

export type Question = {
  id: string
  assignment_id: string
  question_text: string
  question_type: QuestionType
  points: number
  order_index: number
  explanation: string | null
  question_options?: QuestionOption[]
}

export type QuestionOption = {
  id: string
  question_id: string
  option_text: string
  is_correct?: boolean
  order_index: number
}

export type SubscriptionPlan = {
  id: string
  course_id: string
  name: string
  type: PlanType
  price: number
  duration_days: number | null
  module_id: string | null
  term_id?: string | null
  is_active: boolean
}

export type StudentSubscription = {
  id: string
  course_id: string
  module_id: string | null
  term_id?: string | null
  plan_id: string
  status: 'active' | 'expired' | 'cancelled'
  starts_at: string
  ends_at: string | null
  courses?: { title: string; slug?: string } | { title: string; slug?: string }[]
  subscription_plans?: { name: string; type: PlanType; price: number } | { name: string; type: PlanType; price: number }[]
}

export type LessonLockReason = 'schedule' | 'assignment' | 'previous' | null

export type Payment = {
  id: string
  student_id: string
  course_id: string | null
  plan_id: string | null
  method: string
  amount: number
  reference: string | null
  screenshot_path: string | null
  status: PaymentStatus
  kind: 'course_purchase' | 'wallet_deposit'
  created_at: string
  profiles?: { full_name: string; phone: string }
}

export type WalletTransaction = {
  id: string
  type: 'deposit' | 'course_purchase' | 'refund' | 'adjustment'
  amount: number
  status: string
  description: string | null
  created_at: string
}

export type PaymentMethod = {
  id: string
  name: string
  account: string
  enabled: boolean
}

export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'moving'

export type WatermarkSettings = {
  enabled: boolean
  position: WatermarkPosition
}

export type CommunityPost = {
  id: string
  author_id: string
  course_id: string | null
  title: string
  body: string
  created_at: string
  profiles?: { full_name: string }
}

export type CommunityReply = {
  id: string
  post_id: string
  author_id: string
  body: string
  is_teacher_answer: boolean
  created_at: string
  profiles?: { full_name: string }
}

export type LiveSession = {
  id: string
  course_id: string | null
  title: string
  description: string | null
  starts_at: string
  join_url: string | null
  recording_url: string | null
  is_published: boolean
  grade?: string | null
}

export type Notification = {
  id: string
  title: string
  body: string | null
  is_read: boolean
  created_at: string
}

export type Exam = {
  id: string
  title: string
  description: string | null
  grade: string | null
  starts_at: string
  duration_minutes: number
  passing_score: number | null
  is_published: boolean
}

export type LessonProgress = {
  student_id: string
  lesson_id: string
  lesson_completed: boolean
  assignment_completed: boolean
  video_completed: boolean
  last_position?: number
  video_progress?: number
  updated_at?: string
  completed_at?: string | null
  lessons?: { title: string } | { title: string }[]
}

export function slugify(title: string) {
  return `${title.trim().replace(/\s+/g, '-').slice(0, 40)}-${Date.now().toString(36)}`
}

export function extractYoutubeId(value: string) {
  const trimmed = value.trim()
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed
  try {
    const url = new URL(trimmed)
    if (url.hostname.includes('youtu.be')) return url.pathname.replace('/', '')
    return url.searchParams.get('v') ?? ''
  } catch {
    return ''
  }
}
