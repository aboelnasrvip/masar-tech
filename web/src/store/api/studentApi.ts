import { getSupabase } from '@/lib/supabase'
import type {
  Assignment,
  CommunityPost,
  CommunityReply,
  Course,
  CourseModule,
  CourseTerm,
  EditorBlock,
  Lesson,
  LessonProgress,
  LessonResource,
  LiveSession,
  Notification,
  Payment,
  PaymentMethod,
  Exam,
  StudentSubscription,
  SubscriptionPlan,
  WalletTransaction,
  WatermarkSettings,
} from '@/types/models'
import { mergePaymentMethods } from '@/data/wallets'
import { storageFileName } from '@/lib/storage-key'
import { baseApi } from './baseApi'

export const studentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPublishedCourses: build.query<Course[], void>({
      async queryFn() {
        const { data, error } = await getSupabase()
          .from('courses')
          .select('*, subscription_plans(id, name, type, price, is_active)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as Course[] }
      },
      providesTags: ['Course'],
    }),
    getCoursePage: build.query<
      { course: Course; terms: CourseTerm[]; modules: CourseModule[]; plans: SubscriptionPlan[]; lessons: Lesson[] },
      string
    >({
      async queryFn(slug) {
        const supabase = getSupabase()
        const course = await supabase.from('courses').select('*').eq('slug', slug).eq('status', 'published').maybeSingle()
        if (course.error) return { error: { status: 500, data: course.error.message } }
        if (!course.data) return { error: { status: 404, data: 'الكورس مش موجود' } }
        const [terms, modules, plans] = await Promise.all([
          supabase.from('course_terms').select('*').eq('course_id', course.data.id).eq('is_published', true).order('order_index'),
          supabase.from('course_modules').select('*').eq('course_id', course.data.id).eq('is_published', true).order('order_index'),
          supabase.from('subscription_plans').select('*').eq('course_id', course.data.id).eq('is_active', true),
        ])
        const moduleIds = (modules.data ?? []).map((item) => item.id)
        const lessons = moduleIds.length
          ? await supabase.from('lessons').select('*').eq('is_published', true).in('module_id', moduleIds)
          : { data: [] }
        return {
          data: {
            course: course.data as Course,
            terms: (terms.data ?? []) as CourseTerm[],
            modules: (modules.data ?? []) as CourseModule[],
            plans: (plans.data ?? []) as SubscriptionPlan[],
            lessons: (lessons.data ?? []) as Lesson[],
          },
        }
      },
      providesTags: ['Course', 'Lesson'],
    }),
    getTermPage: build.query<
      {
        course: Course
        term: CourseTerm
        months: CourseModule[]
        plans: SubscriptionPlan[]
        lessons: Lesson[]
        progress: LessonProgress[]
        requiredAssignments: Record<string, boolean>
      },
      { slug: string; termId: string }
    >({
      async queryFn({ slug, termId }) {
        const supabase = getSupabase()
        const { data: userData } = await supabase.auth.getUser()
        const course = await supabase.from('courses').select('*').eq('slug', slug).eq('status', 'published').maybeSingle()
        if (course.error) return { error: { status: 500, data: course.error.message } }
        if (!course.data) return { error: { status: 404, data: 'الكورس مش موجود' } }
        const term = await supabase
          .from('course_terms')
          .select('*')
          .eq('id', termId)
          .eq('course_id', course.data.id)
          .eq('is_published', true)
          .maybeSingle()
        if (term.error) return { error: { status: 500, data: term.error.message } }
        if (!term.data) return { error: { status: 404, data: 'الترم مش موجود' } }
        const [months, plans] = await Promise.all([
          supabase
            .from('course_modules')
            .select('*')
            .eq('term_id', termId)
            .eq('is_published', true)
            .order('order_index'),
          supabase
            .from('subscription_plans')
            .select('*')
            .eq('course_id', course.data.id)
            .eq('is_active', true),
        ])
        const monthRows = (months.data ?? []) as CourseModule[]
        const moduleIds = monthRows.map((item) => item.id)
        const lessonsRes = moduleIds.length
          ? await supabase.from('lessons').select('*').eq('is_published', true).in('module_id', moduleIds).order('order_index')
          : { data: [] }
        const lessons = (lessonsRes.data ?? []) as Lesson[]
        const lessonIds = lessons.map((item) => item.id)
        const [progress, assignments] = await Promise.all([
          userData.user && lessonIds.length
            ? supabase.from('lesson_progress').select('*').eq('student_id', userData.user.id).in('lesson_id', lessonIds)
            : Promise.resolve({ data: [] }),
          lessonIds.length
            ? supabase
                .from('assignments')
                .select('lesson_id, is_required, is_published')
                .eq('is_published', true)
                .in('lesson_id', lessonIds)
            : Promise.resolve({ data: [] }),
        ])
        const requiredAssignments: Record<string, boolean> = {}
        for (const item of assignments.data ?? []) {
          requiredAssignments[(item as { lesson_id: string; is_required: boolean }).lesson_id] = Boolean(
            (item as { is_required: boolean }).is_required,
          )
        }
        return {
          data: {
            course: course.data as Course,
            term: term.data as CourseTerm,
            months: monthRows,
            plans: ((plans.data ?? []) as SubscriptionPlan[]).filter(
              (plan) => plan.term_id === termId || moduleIds.includes(plan.module_id ?? ''),
            ),
            lessons,
            progress: (progress.data ?? []) as LessonProgress[],
            requiredAssignments,
          },
        }
      },
      providesTags: ['Course', 'Lesson', 'Payment'],
    }),
    getMonthPage: build.query<
      {
        course: Course
        term: CourseTerm | null
        month: CourseModule
        plan: SubscriptionPlan | null
        lessons: Lesson[]
        progress: LessonProgress[]
        requiredAssignments: Record<string, boolean>
      },
      { slug: string; monthId: string }
    >({
      async queryFn({ slug, monthId }) {
        const supabase = getSupabase()
        const { data: userData } = await supabase.auth.getUser()
        const course = await supabase.from('courses').select('*').eq('slug', slug).eq('status', 'published').maybeSingle()
        if (course.error) return { error: { status: 500, data: course.error.message } }
        if (!course.data) return { error: { status: 404, data: 'الكورس مش موجود' } }
        const month = await supabase
          .from('course_modules')
          .select('*')
          .eq('id', monthId)
          .eq('course_id', course.data.id)
          .eq('is_published', true)
          .maybeSingle()
        if (month.error) return { error: { status: 500, data: month.error.message } }
        if (!month.data) return { error: { status: 404, data: 'الشهر مش موجود' } }
        const term = month.data.term_id
          ? await supabase.from('course_terms').select('*').eq('id', month.data.term_id).maybeSingle()
          : { data: null }
        const [plans, lessonsRes] = await Promise.all([
          supabase.from('subscription_plans').select('*').eq('module_id', monthId).eq('is_active', true).maybeSingle(),
          supabase.from('lessons').select('*').eq('module_id', monthId).eq('is_published', true).order('order_index'),
        ])
        const lessons = (lessonsRes.data ?? []) as Lesson[]
        const lessonIds = lessons.map((item) => item.id)
        const [progress, assignments] = await Promise.all([
          userData.user && lessonIds.length
            ? supabase.from('lesson_progress').select('*').eq('student_id', userData.user.id).in('lesson_id', lessonIds)
            : Promise.resolve({ data: [] }),
          lessonIds.length
            ? supabase.from('assignments').select('lesson_id, is_required, is_published').eq('is_published', true).in('lesson_id', lessonIds)
            : Promise.resolve({ data: [] }),
        ])
        const requiredAssignments: Record<string, boolean> = {}
        for (const item of assignments.data ?? []) {
          requiredAssignments[(item as { lesson_id: string; is_required: boolean }).lesson_id] = Boolean(
            (item as { is_required: boolean }).is_required,
          )
        }
        return {
          data: {
            course: course.data as Course,
            term: (term.data as CourseTerm | null) ?? null,
            month: month.data as CourseModule,
            plan: (plans.data as SubscriptionPlan | null) ?? null,
            lessons,
            progress: (progress.data ?? []) as LessonProgress[],
            requiredAssignments,
          },
        }
      },
      providesTags: ['Course', 'Lesson', 'Payment'],
    }),
    getMySubscriptions: build.query<StudentSubscription[], void>({
      async queryFn() {
        const { data, error } = await getSupabase()
          .from('subscriptions')
          .select('id, course_id, module_id, term_id, plan_id, status, starts_at, ends_at, courses(title, slug), subscription_plans(name, type, price)')
          .order('created_at', { ascending: false })
        if (error) return { error: { status: 500, data: error.message } }
        const now = Date.now()
        return {
          data: ((data ?? []) as StudentSubscription[]).filter(
            (item) => item.status === 'active' && (!item.ends_at || new Date(item.ends_at).getTime() > now),
          ),
        }
      },
      providesTags: ['Payment'],
      keepUnusedDataFor: 0,
    }),
    getPaymentMethods: build.query<PaymentMethod[], void>({
      async queryFn() {
        const { data, error } = await getSupabase().from('platform_settings').select('value').eq('key', 'payment_methods').maybeSingle()
        if (error) return { error: { status: 500, data: error.message } }
        const value = data?.value
        return {
          data: mergePaymentMethods(Array.isArray(value) ? (value as PaymentMethod[]) : null).filter((item) => item.enabled),
        }
      },
      keepUnusedDataFor: 0,
    }),
    submitPayment: build.mutation<
      void,
      {
        studentId: string
        method: string
        reference?: string | null
        file: File
        kind: 'course_purchase' | 'wallet_deposit'
        amount: number
        plan?: SubscriptionPlan | null
      }
    >({
      async queryFn(payload) {
        const supabase = getSupabase()
        const path = `${payload.studentId}/${storageFileName(payload.file.name)}`
        const upload = await supabase.storage.from('payment-proofs').upload(path, payload.file)
        if (upload.error) return { error: { status: 500, data: upload.error.message } }
        const { error } = await supabase.from('payments').insert({
          student_id: payload.studentId,
          course_id: payload.plan?.course_id ?? null,
          plan_id: payload.kind === 'course_purchase' ? payload.plan?.id ?? null : null,
          method: payload.method,
          amount: payload.amount,
          reference: payload.reference ?? null,
          screenshot_path: path,
          kind: payload.kind,
        })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Payment'],
    }),
    buyWithWallet: build.mutation<void, string>({
      async queryFn(planId) {
        const { error } = await getSupabase().rpc('purchase_with_wallet', { p_plan_id: planId })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Payment', 'Course'],
    }),
    getWallet: build.query<{ balance: number; items: WalletTransaction[] }, void>({
      async queryFn() {
        const supabase = getSupabase()
        const [balance, items] = await Promise.all([
          supabase.rpc('wallet_balance'),
          supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }),
        ])
        if (items.error) return { error: { status: 500, data: items.error.message } }
        return { data: { balance: Number(balance.data ?? 0), items: (items.data ?? []) as WalletTransaction[] } }
      },
      providesTags: ['Payment'],
      keepUnusedDataFor: 0,
    }),
    getPayments: build.query<Payment[], void>({
      async queryFn() {
        const { data, error } = await getSupabase().from('payments').select('*').order('created_at', { ascending: false })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as Payment[] }
      },
      providesTags: ['Payment'],
      keepUnusedDataFor: 0,
    }),
    getLessonPage: build.query<
      {
        lesson: Lesson
        module: CourseModule
        course: Course
        siblings: Lesson[]
        resources: LessonResource[]
        editor: EditorBlock | null
        assignment: Assignment | null
        progress: LessonProgress | null
        unlocked: boolean
        entitled: boolean
      },
      string
    >({
      async queryFn(lessonId) {
        const supabase = getSupabase()
        const { data: userData } = await supabase.auth.getUser()
        const lesson = await supabase.from('lessons').select('*').eq('id', lessonId).maybeSingle()
        if (lesson.error) return { error: { status: 500, data: lesson.error.message } }
        if (!lesson.data) return { error: { status: 404, data: 'الدرس مش موجود' } }
        const moduleRes = await supabase.from('course_modules').select('*').eq('id', lesson.data.module_id).maybeSingle()
        const courseRes = await supabase.from('courses').select('*').eq('id', moduleRes.data?.course_id).maybeSingle()
        const [resources, editor, assignment, progress, entitled, unlocked, siblings] = await Promise.all([
          supabase.from('lesson_resources').select('*').eq('lesson_id', lessonId),
          supabase.from('lesson_editor_blocks').select('*').eq('lesson_id', lessonId).maybeSingle(),
          supabase.from('assignments').select('*').eq('lesson_id', lessonId).eq('is_published', true).maybeSingle(),
          supabase.from('lesson_progress').select('*').eq('lesson_id', lessonId).eq('student_id', userData.user?.id).maybeSingle(),
          supabase.rpc('has_course_entitlement', {
            p_student: userData.user?.id,
            p_course: moduleRes.data?.course_id,
            p_module: moduleRes.data?.id,
          }),
          supabase.rpc('lesson_unlocked', {
            p_student: userData.user?.id,
            p_lesson: lessonId,
          }),
          supabase.from('lessons').select('*').eq('module_id', lesson.data.module_id).eq('is_published', true).order('order_index'),
        ])
        return {
          data: {
            lesson: lesson.data as Lesson,
            module: moduleRes.data as CourseModule,
            course: courseRes.data as Course,
            siblings: (siblings.data ?? []) as Lesson[],
            resources: (resources.data ?? []) as LessonResource[],
            editor: (editor.data as EditorBlock | null) ?? null,
            assignment: (assignment.data as Assignment | null) ?? null,
            progress: (progress.data as LessonProgress | null) ?? null,
            unlocked: Boolean(unlocked.data),
            entitled: Boolean(entitled.data),
          },
        }
      },
      providesTags: ['Lesson'],
    }),
    getAssignment: build.query<unknown, string>({
      async queryFn(assignmentId) {
        const supabase = getSupabase()
        const { data, error } = await supabase.rpc('get_assignment_for_student', { p_assignment_id: assignmentId })
        if (error) return { error: { status: 500, data: error.message } }
        const payload: Record<string, unknown> =
          data && typeof data === 'object' && !Array.isArray(data)
            ? { ...(data as Record<string, unknown>) }
            : { questions: [] }
        if (!payload.last_attempt) {
          const { data: userData } = await supabase.auth.getUser()
          if (userData.user?.id) {
            const attempt = await supabase
              .from('assignment_attempts')
              .select(
                'id, score, total_points, percentage, passed, attempt_number, assignment_answers(question_id, is_correct, selected_option_id, answer_text, points_awarded)',
              )
              .eq('assignment_id', assignmentId)
              .eq('student_id', userData.user.id)
              .order('attempt_number', { ascending: false })
              .limit(1)
              .maybeSingle()
            if (attempt.data) {
              const answers = (
                attempt.data as {
                  assignment_answers?: Array<{
                    question_id: string
                    is_correct: boolean
                    selected_option_id: string | null
                    answer_text: string | null
                  }>
                }
              ).assignment_answers
              payload.last_attempt = {
                attempt: attempt.data,
                answers: (answers ?? []).map((item) => ({
                  ...item,
                  selected_text: item.answer_text,
                  correct_text: null,
                  explanation: null,
                })),
              }
            }
          }
        }
        return { data: payload }
      },
      providesTags: ['Lesson'],
      keepUnusedDataFor: 0,
    }),
    submitAssignment: build.mutation<unknown, { assignmentId: string; answers: Record<string, { option_id?: string; text?: string }> }>({
      async queryFn({ assignmentId, answers }) {
        const { data, error } = await getSupabase().rpc('submit_assignment', {
          p_assignment_id: assignmentId,
          p_answers: answers,
        })
        if (error) return { error: { status: 500, data: error.message } }
        return { data }
      },
      invalidatesTags: ['Lesson'],
    }),
    saveLessonProgress: build.mutation<
      void,
      {
        studentId: string
        lessonId: string
        last_position: number
        video_progress?: number
        video_completed?: boolean
      }
    >({
      async queryFn(payload) {
        const row: Record<string, unknown> = {
          student_id: payload.studentId,
          lesson_id: payload.lessonId,
          last_position: payload.last_position,
          updated_at: new Date().toISOString(),
        }
        if (payload.video_progress != null) row.video_progress = payload.video_progress
        if (payload.video_completed != null) row.video_completed = payload.video_completed
        const { error } = await getSupabase().from('lesson_progress').upsert(row)
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
    }),
    completeLesson: build.mutation<void, string>({
      async queryFn(lessonId) {
        const { error } = await getSupabase().rpc('complete_lesson', { p_lesson_id: lessonId })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Lesson'],
    }),
    saveCode: build.mutation<void, { lessonId: string; studentId: string; html: string; css: string; js: string }>({
      async queryFn(payload) {
        const { error } = await getSupabase().from('student_lesson_code').upsert({
          student_id: payload.studentId,
          lesson_id: payload.lessonId,
          html: payload.html,
          css: payload.css,
          js: payload.js,
        })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
    }),
    getCode: build.query<EditorBlock | null, { lessonId: string; studentId: string }>({
      async queryFn({ lessonId, studentId }) {
        const { data, error } = await getSupabase()
          .from('student_lesson_code')
          .select('*')
          .eq('lesson_id', lessonId)
          .eq('student_id', studentId)
          .maybeSingle()
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data as EditorBlock | null) ?? null }
      },
    }),
    getProgress: build.query<LessonProgress[], void>({
      async queryFn() {
        const { data, error } = await getSupabase()
          .from('lesson_progress')
          .select('*, lessons(title)')
          .order('updated_at', { ascending: false })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as LessonProgress[] }
      },
      providesTags: ['Lesson'],
    }),
    getPosts: build.query<CommunityPost[], void>({
      async queryFn() {
        const { data, error } = await getSupabase()
          .from('community_posts')
          .select('*, profiles(full_name)')
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as CommunityPost[] }
      },
    }),
    addPost: build.mutation<void, { author_id: string; title: string; body: string }>({
      async queryFn(payload) {
        const { error } = await getSupabase().from('community_posts').insert(payload)
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
    }),
    getReplies: build.query<CommunityReply[], string>({
      async queryFn(postId) {
        const { data, error } = await getSupabase()
          .from('community_replies')
          .select('*, profiles(full_name)')
          .eq('post_id', postId)
          .eq('is_hidden', false)
          .order('created_at')
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as CommunityReply[] }
      },
    }),
    addReply: build.mutation<void, { post_id: string; author_id: string; body: string; is_teacher_answer?: boolean }>({
      async queryFn(payload) {
        const { error } = await getSupabase().from('community_replies').insert(payload)
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
    }),
    getDiscussions: build.query<
      Array<{
        id: string
        body: string
        created_at: string
        author_id: string
        updated_at?: string | null
        profiles?: { full_name: string; role?: string } | { full_name: string; role?: string }[]
      }>,
      string
    >({
      async queryFn(lessonId) {
        const supabase = getSupabase()
        const withUpdated = await supabase
          .from('lesson_discussions')
          .select('id, body, created_at, updated_at, author_id, profiles!author_id(full_name, role)')
          .eq('lesson_id', lessonId)
          .order('created_at')
        if (!withUpdated.error) return { data: (withUpdated.data ?? []) as never }

        const withAuthor = await supabase
          .from('lesson_discussions')
          .select('id, body, created_at, author_id, profiles!author_id(full_name, role)')
          .eq('lesson_id', lessonId)
          .order('created_at')
        if (!withAuthor.error) return { data: (withAuthor.data ?? []) as never }

        const plain = await supabase
          .from('lesson_discussions')
          .select('id, body, created_at, author_id, profiles(full_name, role)')
          .eq('lesson_id', lessonId)
          .order('created_at')
        if (plain.error) return { error: { status: 500, data: plain.error.message } }
        return { data: (plain.data ?? []) as never }
      },
      providesTags: ['Chat'],
      keepUnusedDataFor: 0,
    }),
    addDiscussion: build.mutation<void, { lesson_id: string; author_id: string; body: string }>({
      async queryFn(payload) {
        const { error } = await getSupabase().from('lesson_discussions').insert(payload)
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Chat'],
    }),
    updateDiscussion: build.mutation<void, { id: string; body: string }>({
      async queryFn({ id, body }) {
        const { error } = await getSupabase()
          .from('lesson_discussions')
          .update({ body, updated_at: new Date().toISOString() })
          .eq('id', id)
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Chat'],
    }),
    deleteDiscussion: build.mutation<void, string>({
      async queryFn(id) {
        const { error } = await getSupabase().from('lesson_discussions').delete().eq('id', id)
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Chat'],
    }),
    getSessions: build.query<LiveSession[], void>({
      async queryFn() {
        const supabase = getSupabase()
        const { data: userData } = await supabase.auth.getUser()
        const [sessions, profile] = await Promise.all([
          supabase.from('live_sessions').select('*').eq('is_published', true).order('starts_at', { ascending: false }),
          userData.user?.id
            ? supabase.from('profiles').select('grade').eq('id', userData.user.id).maybeSingle()
            : Promise.resolve({ data: null }),
        ])
        if (sessions.error) return { error: { status: 500, data: sessions.error.message } }
        const grade = profile.data?.grade
        return {
          data: ((sessions.data ?? []) as LiveSession[]).filter(
            (item) => !item.grade || !grade || item.grade === grade,
          ),
        }
      },
    }),
    getExams: build.query<Exam[], void>({
      async queryFn() {
        const supabase = getSupabase()
        const { data: userData } = await supabase.auth.getUser()
        const [exams, profile] = await Promise.all([
          supabase.from('exams').select('*').eq('is_published', true).order('starts_at', { ascending: false }),
          userData.user?.id
            ? supabase.from('profiles').select('grade').eq('id', userData.user.id).maybeSingle()
            : Promise.resolve({ data: null as { grade?: string | null } | null }),
        ])
        if (exams.error) return { error: { status: 500, data: exams.error.message } }
        const grade = profile.data?.grade
        return {
          data: ((exams.data ?? []) as Exam[]).filter((item) => !item.grade || !grade || item.grade === grade),
        }
      },
      providesTags: ['Exam'],
    }),
    getExam: build.query<unknown, string>({
      async queryFn(examId) {
        const { data, error } = await getSupabase().rpc('get_exam_for_student', { p_exam_id: examId })
        if (error) return { error: { status: 500, data: error.message } }
        return { data }
      },
      providesTags: ['Exam'],
      keepUnusedDataFor: 0,
    }),
    submitExam: build.mutation<
      unknown,
      { examId: string; answers: Record<string, { option_id?: string; text?: string }>; auto?: boolean }
    >({
      async queryFn({ examId, answers, auto }) {
        const { data, error } = await getSupabase().rpc('submit_exam', {
          p_exam_id: examId,
          p_answers: answers,
          p_auto: Boolean(auto),
        })
        if (error) return { error: { status: 500, data: error.message } }
        return { data }
      },
      invalidatesTags: ['Exam'],
    }),
    getNotifications: build.query<Notification[], void>({
      async queryFn() {
        const { data, error } = await getSupabase().from('notifications').select('*').order('created_at', { ascending: false })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as Notification[] }
      },
      providesTags: ['Notification'],
      keepUnusedDataFor: 0,
    }),
    markRead: build.mutation<void, string>({
      async queryFn(id) {
        const { error } = await getSupabase().from('notifications').update({ is_read: true }).eq('id', id)
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Notification'],
    }),
    signedUrl: build.mutation<string, { bucket: string; path: string }>({
      async queryFn({ bucket, path }) {
        const { data, error } = await getSupabase().storage.from(bucket).createSignedUrl(path, 60 * 30)
        if (error || !data?.signedUrl) return { error: { status: 500, data: error?.message ?? 'url' } }
        return { data: data.signedUrl }
      },
    }),
    getWatermarkSettings: build.query<WatermarkSettings, void>({
      async queryFn() {
        const { data, error } = await getSupabase().from('platform_settings').select('value').eq('key', 'video_watermark').maybeSingle()
        if (error) return { error: { status: 500, data: error.message } }
        const value = (data?.value ?? {}) as Partial<WatermarkSettings>
        return {
          data: {
            enabled: value.enabled !== false,
            position: value.position ?? 'moving',
          },
        }
      },
    }),
    reportSecurityEvent: build.mutation<
      void,
      { student_id: string; lesson_id?: string | null; event_type: string; detail?: string }
    >({
      async queryFn(payload) {
        const { error } = await getSupabase().from('lesson_security_events').insert({
          student_id: payload.student_id,
          lesson_id: payload.lesson_id || null,
          event_type: payload.event_type,
          detail: payload.detail ?? null,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
        })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
    }),
  }),
})

export const {
  useGetPublishedCoursesQuery,
  useGetCoursePageQuery,
  useGetTermPageQuery,
  useGetMonthPageQuery,
  useGetMySubscriptionsQuery,
  useGetPaymentMethodsQuery,
  useSubmitPaymentMutation,
  useBuyWithWalletMutation,
  useGetWalletQuery,
  useGetPaymentsQuery,
  useGetLessonPageQuery,
  useGetAssignmentQuery,
  useSubmitAssignmentMutation,
  useCompleteLessonMutation,
  useSaveCodeMutation,
  useGetCodeQuery,
  useGetProgressQuery,
  useGetPostsQuery,
  useAddPostMutation,
  useGetRepliesQuery,
  useAddReplyMutation,
  useGetDiscussionsQuery,
  useAddDiscussionMutation,
  useUpdateDiscussionMutation,
  useDeleteDiscussionMutation,
  useSaveLessonProgressMutation,
  useGetSessionsQuery,
  useGetExamsQuery,
  useGetExamQuery,
  useSubmitExamMutation,
  useGetNotificationsQuery,
  useMarkReadMutation,
  useSignedUrlMutation,
  useGetWatermarkSettingsQuery,
  useReportSecurityEventMutation,
} = studentApi
