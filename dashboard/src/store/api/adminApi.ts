import { getSupabase } from '@/lib/supabase'
import type {
  Assignment,
  CommunityPost,
  Course,
  CourseModule,
  CourseTerm,
  EditorBlock,
  Lesson,
  LessonResource,
  LiveSession,
  Payment,
  PaymentMethod,
  Question,
  SecurityEvent,
  StudentProfile,
  SubscriptionPlan,
  WalletTransaction,
  WatermarkSettings,
  Exam,
} from '@/types/models'
import { mergePaymentMethods } from '@/data/wallets'
import { parseQuizImport } from '@/lib/quiz-import'
import { storageFileName } from '@/lib/storage-key'
import { slugify } from '@/types/models'
import { baseApi } from './baseApi'

export const adminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOverview: build.query<{ students: number; courses: number; pending: number; subscriptions: number }, void>({
      async queryFn() {
        const supabase = getSupabase()
        const [students, courses, pending, subscriptions] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('courses').select('id', { count: 'exact', head: true }),
          supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        ])
        return {
          data: {
            students: students.count ?? 0,
            courses: courses.count ?? 0,
            pending: pending.count ?? 0,
            subscriptions: subscriptions.count ?? 0,
          },
        }
      },
      providesTags: ['Course', 'Payment', 'Student'],
    }),
    getCourses: build.query<Course[], void>({
      async queryFn() {
        const { data, error } = await getSupabase().from('courses').select('*').order('created_at', { ascending: false })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as Course[] }
      },
      providesTags: ['Course'],
    }),
    saveCourse: build.mutation<Course, Partial<Course> & { title: string }>({
      async queryFn(payload) {
        const supabase = getSupabase()
        const row = {
          title: payload.title,
          slug: payload.slug || slugify(payload.title),
          description: payload.description ?? '',
          image_url: payload.image_url ?? null,
          subject: payload.subject ?? 'برمجة',
          educational_stage: payload.educational_stage ?? 'secondary',
          grade: payload.grade ?? 'sec-1',
          academic_year: payload.academic_year ?? '2026',
          status: payload.status ?? 'draft',
        }
        const query = payload.id
          ? supabase.from('courses').update(row).eq('id', payload.id).select().single()
          : supabase.from('courses').insert(row).select().single()
        const { data, error } = await query
        if (error) return { error: { status: 500, data: error.message } }
        return { data: data as Course }
      },
      invalidatesTags: ['Course'],
    }),
    getCourseBundle: build.query<
      { course: Course; terms: CourseTerm[]; modules: CourseModule[]; plans: SubscriptionPlan[] },
      string
    >({
      async queryFn(courseId) {
        const supabase = getSupabase()
        const [course, terms, modules, plans] = await Promise.all([
          supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
          supabase.from('course_terms').select('*').eq('course_id', courseId).order('order_index'),
          supabase.from('course_modules').select('*').eq('course_id', courseId).order('order_index'),
          supabase.from('subscription_plans').select('*').eq('course_id', courseId),
        ])
        if (course.error) return { error: { status: 500, data: course.error.message } }
        if (!course.data) return { error: { status: 404, data: 'الكورس مش موجود' } }
        return {
          data: {
            course: course.data as Course,
            terms: (terms.data ?? []) as CourseTerm[],
            modules: (modules.data ?? []) as CourseModule[],
            plans: (plans.data ?? []) as SubscriptionPlan[],
          },
        }
      },
      providesTags: ['Course', 'Lesson'],
    }),
    saveTerm: build.mutation<CourseTerm, Partial<CourseTerm> & { course_id: string; title: string }>({
      async queryFn(payload) {
        const supabase = getSupabase()
        const row = {
          course_id: payload.course_id,
          title: payload.title,
          description: payload.description ?? '',
          image_url: payload.image_url ?? null,
          price: payload.price ?? 0,
          order_index: payload.order_index ?? 0,
          is_published: payload.is_published ?? false,
        }
        const query = payload.id
          ? supabase.from('course_terms').update(row).eq('id', payload.id).select().single()
          : supabase.from('course_terms').insert(row).select().single()
        const { data, error } = await query
        if (error) return { error: { status: 500, data: error.message } }
        const term = data as CourseTerm
        const existing = await supabase
          .from('subscription_plans')
          .select('id')
          .eq('term_id', term.id)
          .eq('type', 'full_term')
          .maybeSingle()
        if (term.price > 0) {
          if (!existing.data) {
            await supabase.from('subscription_plans').insert({
              course_id: term.course_id,
              term_id: term.id,
              name: `${term.title} — ترم كامل`,
              type: 'full_term',
              price: term.price,
              duration_days: null,
              is_active: true,
            })
          } else {
            await supabase
              .from('subscription_plans')
              .update({ price: term.price, name: `${term.title} — ترم كامل`, is_active: true })
              .eq('id', existing.data.id)
          }
        }
        return { data: term }
      },
      invalidatesTags: ['Course'],
    }),
    saveModule: build.mutation<CourseModule, Partial<CourseModule> & { course_id: string; title: string }>({
      async queryFn(payload) {
        const supabase = getSupabase()
        const row = {
          course_id: payload.course_id,
          term_id: payload.term_id ?? null,
          title: payload.title,
          description: payload.description ?? '',
          order_index: payload.order_index ?? 0,
          is_published: payload.is_published ?? false,
          price: payload.price ?? 0,
        }
        const query = payload.id
          ? supabase.from('course_modules').update(row).eq('id', payload.id).select().single()
          : supabase.from('course_modules').insert(row).select().single()
        const { data, error } = await query
        if (error) return { error: { status: 500, data: error.message } }
        const module = data as CourseModule
        if (module.price && module.price > 0) {
          const existing = await supabase
            .from('subscription_plans')
            .select('id')
            .eq('module_id', module.id)
            .eq('type', 'monthly')
            .maybeSingle()
          if (!existing.data) {
            await supabase.from('subscription_plans').insert({
              course_id: module.course_id,
              term_id: module.term_id ?? null,
              module_id: module.id,
              name: module.title,
              type: 'monthly',
              price: module.price,
              duration_days: null,
              is_active: true,
            })
          } else {
            await supabase
              .from('subscription_plans')
              .update({ price: module.price, name: module.title, term_id: module.term_id ?? null, is_active: true })
              .eq('id', existing.data.id)
          }
        }
        return { data: module }
      },
      invalidatesTags: ['Course', 'Lesson'],
    }),
    savePlan: build.mutation<void, Partial<SubscriptionPlan> & { course_id: string; name: string; type: 'monthly' | 'full_term'; price: number }>({
      async queryFn(payload) {
        const { error } = await getSupabase().from('subscription_plans').insert({
          course_id: payload.course_id,
          name: payload.name,
          type: payload.type,
          price: payload.price,
          duration_days: payload.duration_days ?? null,
          module_id: payload.module_id ?? null,
          is_active: true,
        })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Course'],
    }),
    getModuleLessons: build.query<Lesson[], string>({
      async queryFn(moduleId) {
        const { data, error } = await getSupabase().from('lessons').select('*').eq('module_id', moduleId).order('order_index')
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as Lesson[] }
      },
      providesTags: ['Lesson'],
    }),
    saveLesson: build.mutation<Lesson, Partial<Lesson> & { module_id: string; title: string }>({
      async queryFn(payload) {
        const supabase = getSupabase()
        const row: Record<string, unknown> = {
          module_id: payload.module_id,
          title: payload.title,
          slug: payload.slug || slugify(payload.title),
          description: payload.description ?? '',
          order_index: payload.order_index ?? 0,
          is_published: payload.is_published ?? false,
          video_provider: payload.video_provider ?? 'youtube',
          video_id: payload.video_id ?? null,
          video_title: payload.video_title ?? null,
          video_thumbnail: payload.video_thumbnail ?? null,
          upload_method: payload.upload_method ?? null,
          video_visible: payload.video_visible ?? true,
          pdf_visible: payload.pdf_visible ?? true,
          editor_visible: payload.editor_visible ?? false,
          assignment_visible: payload.assignment_visible ?? false,
        }
        if ('available_at' in payload) {
          row.available_at = payload.available_at ?? null
        }
        const query = payload.id
          ? supabase.from('lessons').update(row).eq('id', payload.id).select().single()
          : supabase.from('lessons').insert(row).select().single()
        const { data, error } = await query
        if (error) return { error: { status: 500, data: error.message } }
        return { data: data as Lesson }
      },
      invalidatesTags: ['Lesson'],
    }),
    getLessonBundle: build.query<
      { lesson: Lesson; resources: LessonResource[]; editor: EditorBlock | null; assignment: Assignment | null; questions: Question[] },
      string
    >({
      async queryFn(lessonId) {
        const supabase = getSupabase()
        const [lesson, resources, editor, assignment] = await Promise.all([
          supabase.from('lessons').select('*').eq('id', lessonId).maybeSingle(),
          supabase.from('lesson_resources').select('*').eq('lesson_id', lessonId),
          supabase.from('lesson_editor_blocks').select('*').eq('lesson_id', lessonId).maybeSingle(),
          supabase.from('assignments').select('*').eq('lesson_id', lessonId).maybeSingle(),
        ])
        if (lesson.error) return { error: { status: 500, data: lesson.error.message } }
        if (!lesson.data) return { error: { status: 404, data: 'الدرس مش موجود' } }
        let questions: Question[] = []
        if (assignment.data) {
          const { data } = await supabase
            .from('questions')
            .select('*, question_options(*)')
            .eq('assignment_id', assignment.data.id)
            .order('order_index')
          questions = (data ?? []) as Question[]
        }
        return {
          data: {
            lesson: lesson.data as Lesson,
            resources: (resources.data ?? []) as LessonResource[],
            editor: (editor.data as EditorBlock | null) ?? null,
            assignment: (assignment.data as Assignment | null) ?? null,
            questions,
          },
        }
      },
      providesTags: ['Lesson'],
    }),
    saveEditor: build.mutation<void, { lesson_id: string; html: string; css: string; js: string }>({
      async queryFn(payload) {
        const { error } = await getSupabase().from('lesson_editor_blocks').upsert(payload)
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Lesson'],
    }),
    uploadPdf: build.mutation<void, { lesson: Lesson; file: File; title: string }>({
      async queryFn({ lesson, file, title }) {
        const supabase = getSupabase()
        const path = `${lesson.module_id}/${lesson.id}/${storageFileName(file.name)}`
        const upload = await supabase.storage.from('course-resources').upload(path, file, { upsert: true })
        if (upload.error) return { error: { status: 500, data: upload.error.message } }
        const { error } = await supabase.from('lesson_resources').insert({
          lesson_id: lesson.id,
          title,
          file_path: path,
          file_type: 'pdf',
        })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Lesson'],
    }),
    saveAssignment: build.mutation<Assignment, Partial<Assignment> & { lesson_id: string; title: string }>({
      async queryFn(payload) {
        const supabase = getSupabase()
        const row = {
          lesson_id: payload.lesson_id,
          title: payload.title,
          description: payload.description ?? '',
          passing_score: payload.passing_score ?? 50,
          max_attempts: payload.max_attempts ?? null,
          is_required: payload.is_required ?? true,
          is_published: payload.is_published ?? false,
        }
        const query = payload.id
          ? supabase.from('assignments').update(row).eq('id', payload.id).select().single()
          : supabase.from('assignments').insert(row).select().single()
        const { data, error } = await query
        if (error) return { error: { status: 500, data: error.message } }
        return { data: data as Assignment }
      },
      invalidatesTags: ['Lesson'],
    }),
    saveQuestion: build.mutation<void, { assignment_id: string; question_text: string; question_type: Question['question_type']; points: number; explanation: string; options: Array<{ option_text: string; is_correct: boolean }> }>({
      async queryFn(payload) {
        const supabase = getSupabase()
        const { data, error } = await supabase
          .from('questions')
          .insert({
            assignment_id: payload.assignment_id,
            question_text: payload.question_text,
            question_type: payload.question_type,
            points: payload.points,
            explanation: payload.explanation,
          })
          .select()
          .single()
        if (error) return { error: { status: 500, data: error.message } }
        if (payload.options.length) {
          const { error: optionError } = await supabase.from('question_options').insert(
            payload.options.map((option, index) => ({
              question_id: data.id,
              option_text: option.option_text,
              is_correct: option.is_correct,
              order_index: index,
            })),
          )
          if (optionError) return { error: { status: 500, data: optionError.message } }
        }
        return { data: undefined }
      },
      invalidatesTags: ['Lesson'],
    }),
    getStudents: build.query<StudentProfile[], void>({
      async queryFn() {
        const { data, error } = await getSupabase().from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as StudentProfile[] }
      },
      providesTags: ['Student'],
    }),
    getPayments: build.query<Payment[], void>({
      async queryFn() {
        const { data, error } = await getSupabase()
          .from('payments')
          .select('*, profiles!student_id(full_name, phone), courses(title), subscription_plans(name, type)')
          .order('created_at', { ascending: false })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as Payment[] }
      },
      providesTags: ['Payment'],
      keepUnusedDataFor: 0,
    }),
    reviewPayment: build.mutation<void, { id: string; approve: boolean }>({
      async queryFn({ id, approve }) {
        const { error } = await getSupabase().rpc(approve ? 'approve_payment' : 'reject_payment', {
          p_payment_id: id,
        })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Payment'],
    }),
    getWallet: build.query<WalletTransaction[], void>({
      async queryFn() {
        const { data, error } = await getSupabase()
          .from('wallet_transactions')
          .select('*, profiles(full_name)')
          .order('created_at', { ascending: false })
          .limit(100)
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as WalletTransaction[] }
      },
      providesTags: ['Payment'],
    }),
    getPosts: build.query<CommunityPost[], void>({
      async queryFn() {
        const { data, error } = await getSupabase()
          .from('community_posts')
          .select('*, profiles(full_name)')
          .order('created_at', { ascending: false })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as CommunityPost[] }
      },
    }),
    hidePost: build.mutation<void, string>({
      async queryFn(id) {
        const { error } = await getSupabase().from('community_posts').update({ is_hidden: true }).eq('id', id)
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
    }),
    getSessions: build.query<LiveSession[], void>({
      async queryFn() {
        const { data, error } = await getSupabase().from('live_sessions').select('*').order('starts_at', { ascending: false })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as LiveSession[] }
      },
      providesTags: ['Live'],
    }),
    saveSession: build.mutation<void, Partial<LiveSession> & { title: string; starts_at: string }>({
      async queryFn(payload) {
        const { error } = await getSupabase().from('live_sessions').insert({
          title: payload.title,
          starts_at: payload.starts_at,
          join_url: payload.join_url || null,
          description: payload.description || null,
          grade: payload.grade || null,
          is_published: payload.is_published ?? true,
        })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Live'],
    }),
    getSettings: build.query<PaymentMethod[], void>({
      async queryFn() {
        const { data, error } = await getSupabase().from('platform_settings').select('value').eq('key', 'payment_methods').maybeSingle()
        if (error) return { error: { status: 500, data: error.message } }
        const value = data?.value
        return { data: mergePaymentMethods(Array.isArray(value) ? (value as PaymentMethod[]) : null) }
      },
      providesTags: ['Settings'],
      keepUnusedDataFor: 0,
    }),
    saveSettings: build.mutation<void, PaymentMethod[]>({
      async queryFn(methods) {
        const { error } = await getSupabase().from('platform_settings').upsert({
          key: 'payment_methods',
          value: methods,
        })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Settings'],
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
      providesTags: ['Settings'],
    }),
    saveWatermarkSettings: build.mutation<void, WatermarkSettings>({
      async queryFn(payload) {
        const { error } = await getSupabase().from('platform_settings').upsert({
          key: 'video_watermark',
          value: payload,
        })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Settings'],
    }),
    getSecurityEvents: build.query<SecurityEvent[], string | void>({
      async queryFn(studentId) {
        let query = getSupabase()
          .from('lesson_security_events')
          .select('*, profiles(full_name, phone, grade), lessons(title)')
          .order('created_at', { ascending: false })
          .limit(studentId ? 500 : 1000)
        if (studentId) query = query.eq('student_id', studentId)
        const { data, error } = await query
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as SecurityEvent[] }
      },
      providesTags: ['Security'],
      keepUnusedDataFor: 0,
    }),
    deleteSecurityEvents: build.mutation<void, string | void>({
      async queryFn(studentId) {
        let query = getSupabase().from('lesson_security_events').delete()
        query = studentId ? query.eq('student_id', studentId) : query.gte('created_at', '1970-01-01')
        const { error } = await query
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Security'],
    }),
    youtubeStart: build.mutation<{ url: string }, void>({
      async queryFn() {
        const { data, error } = await getSupabase().functions.invoke('youtube-oauth-start')
        if (error) return { error: { status: 500, data: error.message } }
        return { data }
      },
    }),
    youtubeToken: build.mutation<{ access_token: string; channel_title?: string }, void>({
      async queryFn() {
        const { data, error } = await getSupabase().functions.invoke('youtube-access-token')
        if (error) return { error: { status: 500, data: error.message } }
        if (data?.error) return { error: { status: 400, data: data.error } }
        return { data }
      },
    }),
    youtubeUpload: build.mutation<{ video_id: string; title?: string; thumbnail?: string }, { path: string; title: string }>({
      async queryFn(payload) {
        const { data, error } = await getSupabase().functions.invoke('youtube-upload', { body: payload })
        if (error) return { error: { status: 500, data: error.message } }
        if (data?.error) return { error: { status: 400, data: data.error } }
        return { data }
      },
    }),
    importQuestions: build.mutation<number, { assignmentId: string; payload: unknown }>({
      async queryFn({ assignmentId, payload }) {
        const supabase = getSupabase()
        let questions
        try {
          questions = parseQuizImport(payload)
        } catch {
          return { error: { status: 400, data: 'ملف JSON مش سليم. لازم يكون فيه questions.' } }
        }
        if (!questions.length) {
          return { error: { status: 400, data: 'مفيش أسئلة صالحة في الملف' } }
        }

        const rpc = await supabase.rpc('import_assignment_questions', {
          p_assignment_id: assignmentId,
          p_payload: payload,
        })
        if (!rpc.error) {
          const count = Number(rpc.data ?? 0)
          if (count > 0) return { data: count }
          return { error: { status: 400, data: 'مفيش أسئلة اتضافت. راجع ملف JSON.' } }
        }

        let inserted = 0
        for (const question of questions) {
          const { data, error } = await supabase
            .from('questions')
            .insert({
              assignment_id: assignmentId,
              question_text: question.question_text,
              question_type: question.question_type,
              points: question.points,
              order_index: question.order_index,
              explanation: question.explanation,
            })
            .select('id')
            .single()
          if (error) return { error: { status: 500, data: error.message } }
          if (question.options.length) {
            const { error: optionError } = await supabase.from('question_options').insert(
              question.options.map((option) => ({
                question_id: data.id,
                option_text: option.option_text,
                is_correct: option.is_correct,
                order_index: option.order_index,
              })),
            )
            if (optionError) return { error: { status: 500, data: optionError.message } }
          }
          inserted += 1
        }
        return { data: inserted }
      },
      invalidatesTags: ['Lesson'],
    }),
    notifyStudents: build.mutation<number, { title: string; body: string; userId?: string; grade?: string }>({
      async queryFn(payload) {
        const { data, error } = await getSupabase().rpc('notify_students', {
          p_title: payload.title,
          p_body: payload.body,
          p_user_id: payload.userId ?? null,
          p_grade: payload.grade ?? null,
        })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: Number(data ?? 0) }
      },
    }),
    deleteCourse: build.mutation<void, string>({
      async queryFn(id) {
        const { error } = await getSupabase().from('courses').delete().eq('id', id)
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Course'],
    }),
    deleteTerm: build.mutation<void, string>({
      async queryFn(id) {
        const { error } = await getSupabase().from('course_terms').delete().eq('id', id)
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Course'],
    }),
    deleteModule: build.mutation<void, string>({
      async queryFn(id) {
        const { error } = await getSupabase().from('course_modules').delete().eq('id', id)
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Course', 'Lesson'],
    }),
    deleteLesson: build.mutation<void, string>({
      async queryFn(id) {
        const { error } = await getSupabase().from('lessons').delete().eq('id', id)
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Lesson', 'Course'],
    }),
    getAssignmentAttempts: build.query<
      Array<{
        id: string
        score: number
        total_points: number
        percentage: number
        passed: boolean
        submitted_at: string
        attempt_number: number
        student_id: string
        assignment_id: string
        profiles?: { full_name: string; phone: string } | { full_name: string; phone: string }[]
        assignments?: { title: string; lesson_id: string; lessons?: { title: string } | { title: string }[] } | { title: string; lesson_id: string }[]
        assignment_answers?: Array<{
          is_correct: boolean
          answer_text: string | null
          questions?: { question_text: string; explanation: string | null } | { question_text: string; explanation: string | null }[]
        }>
      }>,
      void
    >({
      async queryFn() {
        const { data, error } = await getSupabase()
          .from('assignment_attempts')
          .select(
            'id, score, total_points, percentage, passed, submitted_at, attempt_number, student_id, assignment_id, profiles!student_id(full_name, phone), assignments(title, lesson_id, lessons(title)), assignment_answers(is_correct, answer_text, questions(question_text, explanation))',
          )
          .order('submitted_at', { ascending: false })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as never }
      },
      providesTags: ['Assignment'],
      keepUnusedDataFor: 0,
    }),
    getLessonChats: build.query<
      Array<{
        id: string
        body: string
        created_at: string
        updated_at?: string | null
        lesson_id: string
        author_id: string
        lessons?: { title: string } | { title: string }[]
        profiles?: { full_name: string; role?: string } | { full_name: string; role?: string }[]
      }>,
      string | void
    >({
      async queryFn(lessonId) {
        let query = getSupabase()
          .from('lesson_discussions')
          .select('id, body, created_at, updated_at, lesson_id, author_id, lessons(title), profiles!author_id(full_name, role)')
          .order('created_at', { ascending: true })
          .limit(400)
        if (lessonId) query = query.eq('lesson_id', lessonId)
        const { data, error } = await query
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as never }
      },
      providesTags: ['Chat'],
      keepUnusedDataFor: 0,
    }),
    addLessonChat: build.mutation<void, { lesson_id: string; author_id: string; body: string }>({
      async queryFn(payload) {
        const { error } = await getSupabase().from('lesson_discussions').insert(payload)
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Chat'],
    }),
    updateLessonChat: build.mutation<void, { id: string; body: string }>({
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
    deleteLessonChat: build.mutation<void, string>({
      async queryFn(id) {
        const { error } = await getSupabase().from('lesson_discussions').delete().eq('id', id)
        if (error) return { error: { status: 500, data: error.message } }
        return { data: undefined }
      },
      invalidatesTags: ['Chat'],
    }),
    getExams: build.query<(Exam & { exam_questions?: { id: string }[] })[], void>({
      async queryFn() {
        const { data, error } = await getSupabase()
          .from('exams')
          .select('*, exam_questions(id)')
          .order('starts_at', { ascending: false })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: (data ?? []) as never }
      },
      providesTags: ['Exam'],
      keepUnusedDataFor: 0,
    }),
    saveExam: build.mutation<Exam, Partial<Exam> & { title: string; starts_at: string; duration_minutes: number }>({
      async queryFn(payload) {
        const row = {
          title: payload.title,
          description: payload.description ?? null,
          grade: payload.grade || null,
          starts_at: payload.starts_at,
          duration_minutes: payload.duration_minutes,
          passing_score: payload.passing_score ?? null,
          is_published: payload.is_published ?? false,
          updated_at: new Date().toISOString(),
        }
        const query = payload.id
          ? getSupabase().from('exams').update(row).eq('id', payload.id).select().single()
          : getSupabase().from('exams').insert(row).select().single()
        const { data, error } = await query
        if (error) return { error: { status: 500, data: error.message } }
        return { data: data as Exam }
      },
      invalidatesTags: ['Exam'],
    }),
    importExamQuestions: build.mutation<number, { examId: string; payload: unknown }>({
      async queryFn({ examId, payload }) {
        const { data, error } = await getSupabase().rpc('import_exam_questions', {
          p_exam_id: examId,
          p_payload: payload,
        })
        if (error) return { error: { status: 500, data: error.message } }
        return { data: Number(data ?? 0) }
      },
      invalidatesTags: ['Exam'],
    }),
    getExamAttempts: build.query<
      Array<{
        id: string
        score: number
        total_points: number
        percentage: number
        passed: boolean
        auto_submitted: boolean
        submitted_at: string
        student_id: string
        exam_id: string
        profiles?: { full_name: string; phone: string } | { full_name: string; phone: string }[]
        exams?: { title: string } | { title: string }[]
        exam_answers?: Array<{
          is_correct: boolean
          answer_text: string | null
          questions?: { question_text: string; explanation: string | null } | { question_text: string; explanation: string | null }[]
        }>
      }>,
      void
    >({
      async queryFn() {
        const { data, error } = await getSupabase()
          .from('exam_attempts')
          .select(
            'id, score, total_points, percentage, passed, auto_submitted, submitted_at, student_id, exam_id, profiles!student_id(full_name, phone), exams(title), exam_answers(is_correct, answer_text, exam_questions(question_text, explanation))',
          )
          .order('submitted_at', { ascending: false })
        if (error) return { error: { status: 500, data: error.message } }
        return {
          data: ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
            ...item,
            exam_answers: (
              (item.exam_answers as Array<{ exam_questions?: unknown; is_correct: boolean; answer_text: string | null }>) ?? []
            ).map((answer) => ({
              is_correct: answer.is_correct,
              answer_text: answer.answer_text,
              questions: answer.exam_questions,
            })),
          })) as never,
        }
      },
      providesTags: ['Exam'],
      keepUnusedDataFor: 0,
    }),
    uploadCover: build.mutation<string, File>({
      async queryFn(file) {
        const supabase = getSupabase()
        const path = `covers/${storageFileName(file.name)}`
        const upload = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
        if (upload.error) return { error: { status: 500, data: upload.error.message } }
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        return { data: data.publicUrl }
      },
    }),
  }),
})

export const {
  useGetOverviewQuery,
  useGetCoursesQuery,
  useSaveCourseMutation,
  useGetCourseBundleQuery,
  useSaveTermMutation,
  useSaveModuleMutation,
  useSavePlanMutation,
  useGetModuleLessonsQuery,
  useSaveLessonMutation,
  useGetLessonBundleQuery,
  useSaveEditorMutation,
  useUploadPdfMutation,
  useSaveAssignmentMutation,
  useSaveQuestionMutation,
  useImportQuestionsMutation,
  useGetAssignmentAttemptsQuery,
  useGetStudentsQuery,
  useGetPaymentsQuery,
  useReviewPaymentMutation,
  useGetWalletQuery,
  useGetPostsQuery,
  useHidePostMutation,
  useGetSessionsQuery,
  useSaveSessionMutation,
  useGetSettingsQuery,
  useSaveSettingsMutation,
  useGetWatermarkSettingsQuery,
  useSaveWatermarkSettingsMutation,
  useGetSecurityEventsQuery,
  useDeleteSecurityEventsMutation,
  useYoutubeStartMutation,
  useYoutubeTokenMutation,
  useYoutubeUploadMutation,
  useNotifyStudentsMutation,
  useUploadCoverMutation,
  useDeleteCourseMutation,
  useDeleteTermMutation,
  useDeleteModuleMutation,
  useDeleteLessonMutation,
  useGetExamAttemptsQuery,
  useGetExamsQuery,
  useSaveExamMutation,
  useImportExamQuestionsMutation,
  useGetLessonChatsQuery,
  useAddLessonChatMutation,
  useUpdateLessonChatMutation,
  useDeleteLessonChatMutation,
} = adminApi
