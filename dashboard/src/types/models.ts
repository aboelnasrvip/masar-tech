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
  courses?: { title: string } | { title: string }[]
  subscription_plans?: { name: string; type: string } | { name: string; type: string }[]
}

export type WalletTransaction = {
  id: string
  student_id?: string
  type: 'deposit' | 'course_purchase' | 'refund' | 'adjustment'
  amount: number
  status: string
  description: string | null
  created_at: string
  profiles?: { full_name: string }
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

export type SecurityEvent = {
  id: string
  student_id: string
  lesson_id: string | null
  event_type: string
  detail: string | null
  page_url: string | null
  user_agent: string | null
  created_at: string
  profiles?: { full_name: string; phone: string; grade: string | null } | { full_name: string; phone: string; grade: string | null }[]
  lessons?: { title: string } | { title: string }[]
}

export type CommunityPost = {
  id: string
  author_id: string
  course_id: string | null
  title: string
  body: string
  created_at: string
  is_hidden?: boolean
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

export type StudentProfile = {
  id: string
  full_name: string
  phone: string
  city: string | null
  governorate: string | null
  school: string | null
  grade: string | null
  role: string
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
  created_at?: string
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
