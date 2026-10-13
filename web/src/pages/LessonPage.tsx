import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { LessonChat } from '@/components/lesson/LessonChat'
import { WebEditor } from '@/components/lesson/WebEditor'
import { YouTubePlayer } from '@/components/lesson/YouTubePlayer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { answersFromAttempt, extractLastAttempt, extractQuizQuestions, type QuizResult } from '@/lib/quiz'
import { lockLabel } from '@/lib/unlock'
import { useAppSelector } from '@/store/hooks'
import {
  useAddDiscussionMutation,
  useCompleteLessonMutation,
  useDeleteDiscussionMutation,
  useGetAssignmentQuery,
  useGetCodeQuery,
  useGetDiscussionsQuery,
  useGetLessonPageQuery,
  useGetWatermarkSettingsQuery,
  useReportSecurityEventMutation,
  useSaveCodeMutation,
  useSaveLessonProgressMutation,
  useSignedUrlMutation,
  useSubmitAssignmentMutation,
  useUpdateDiscussionMutation,
} from '@/store/api/studentApi'
import type { SecurityEventType } from '@/lib/lesson-security'

function scrollKey(lessonId: string) {
  return `lesson-scroll:${lessonId}`
}

function draftKey(assignmentId: string) {
  return `lesson-answers:${assignmentId}`
}

function getPlatformScroll() {
  return document.getElementById('platform-scroll')
}

export function LessonPage() {
  const { lessonId = '' } = useParams()
  const user = useAppSelector((state) => state.auth.user)
  const profile = useAppSelector((state) => state.auth.profile)
  const { data } = useGetLessonPageQuery(lessonId, { skip: !lessonId })
  const { data: watermark } = useGetWatermarkSettingsQuery()
  const [reportSecurity] = useReportSecurityEventMutation()
  const lastEvent = useRef<Record<string, number>>({})
  const restoredScroll = useRef('')
  function reportSecurityEvent(eventType: SecurityEventType, detail?: string) {
    if (!user || !lessonId) return
    const now = Date.now()
    const wait = eventType === 'video_seek' ? 20000 : 8000
    if (now - (lastEvent.current[eventType] ?? 0) < wait) return
    lastEvent.current[eventType] = now
    void reportSecurity({ student_id: user.id, lesson_id: lessonId, event_type: eventType, detail })
  }
  const { data: assignmentData, isFetching: assignmentLoading } = useGetAssignmentQuery(data?.assignment?.id ?? '', {
    skip: !data?.assignment?.id || !data?.unlocked,
  })
  const { data: savedCode } = useGetCodeQuery(
    { lessonId, studentId: user?.id ?? '' },
    { skip: !user || !lessonId || !data?.unlocked },
  )
  const { data: discussions = [] } = useGetDiscussionsQuery(lessonId, { skip: !lessonId || !data?.unlocked, pollingInterval: 8000 })
  const [completeLesson] = useCompleteLessonMutation()
  const [submitAssignment] = useSubmitAssignmentMutation()
  const [saveCode] = useSaveCodeMutation()
  const [saveLessonProgress] = useSaveLessonProgressMutation()
  const [addDiscussion] = useAddDiscussionMutation()
  const [updateDiscussion] = useUpdateDiscussionMutation()
  const [deleteDiscussion] = useDeleteDiscussionMutation()
  const [signedUrl] = useSignedUrlMutation()
  const [code, setCode] = useState({ html: '', css: '', js: '' })
  const [answers, setAnswers] = useState<Record<string, { option_id?: string; text?: string }>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [quizError, setQuizError] = useState('')

  const persistProgress = useCallback(
    (seconds: number, duration = 0) => {
      if (!user || !lessonId || seconds < 1) return
      void saveLessonProgress({
        studentId: user.id,
        lessonId,
        last_position: seconds,
        ...(duration > 0
          ? {
              video_progress: Math.min(100, (seconds / duration) * 100),
              video_completed: seconds / duration >= 0.9,
            }
          : {}),
      })
    },
    [lessonId, saveLessonProgress, user],
  )

  useEffect(() => {
    if (savedCode) setCode({ html: savedCode.html, css: savedCode.css, js: savedCode.js })
    else if (data?.editor) setCode({ html: data.editor.html, css: data.editor.css, js: data.editor.js })
  }, [savedCode, data?.editor])

  useEffect(() => {
    const last = extractLastAttempt(assignmentData)
    if (last?.attempt) {
      setResult(last)
      setAnswers(answersFromAttempt(last))
      return
    }
    const assignmentId = data?.assignment?.id
    if (!assignmentId) return
    try {
      const raw = localStorage.getItem(draftKey(assignmentId))
      if (raw) setAnswers(JSON.parse(raw) as Record<string, { option_id?: string; text?: string }>)
    } catch {
      /* ignore broken draft */
    }
  }, [assignmentData, data?.assignment?.id])

  useEffect(() => {
    const assignmentId = data?.assignment?.id
    if (!assignmentId || result?.attempt) return
    localStorage.setItem(draftKey(assignmentId), JSON.stringify(answers))
  }, [answers, data?.assignment?.id, result?.attempt])

  useEffect(() => {
    if (!lessonId || !data) return
    if (restoredScroll.current === lessonId) return
    restoredScroll.current = lessonId
    const y = Number(localStorage.getItem(scrollKey(lessonId)) || 0)
    if (y > 0) {
      window.setTimeout(() => {
        const root = getPlatformScroll()
        if (root) root.scrollTop = y
      }, 80)
    }
  }, [data, lessonId])

  useEffect(() => {
    const root = getPlatformScroll()
    if (!lessonId || !root) return
    let ticking = 0
    function onScroll() {
      window.clearTimeout(ticking)
      ticking = window.setTimeout(() => {
        localStorage.setItem(scrollKey(lessonId), String(root.scrollTop))
      }, 250)
    }
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      root.removeEventListener('scroll', onScroll)
      localStorage.setItem(scrollKey(lessonId), String(root.scrollTop))
    }
  }, [lessonId])

  if (!data) return <p className="neuro-text-muted">جاري التحميل...</p>

  if (!data.entitled) {
    const termPath = data.module.term_id
      ? `/courses/${data.course.slug}/terms/${data.module.term_id}`
      : `/courses/${data.course.slug}`
    return (
      <Locked
        title="محتاج اشتراك"
        text="اشترِ الشهر أو الترم كامل عشان تفتح المحتوى."
        action={
          <Link to={termPath} className="neuro-accent">
            الرجوع للشراء
          </Link>
        }
      />
    )
  }

  const questions = extractQuizQuestions(assignmentData)
  const resultByQuestion = Object.fromEntries((result?.answers ?? []).map((item) => [item.question_id, item]))
  const submitted = Boolean(result?.attempt)
  const monthPath = data.module.term_id
    ? `/courses/${data.course.slug}/terms/${data.module.term_id}/months/${data.module.id}`
    : `/courses/${data.course.slug}`

  return (
    <div className="space-y-5">
      <p className="neuro-text-muted text-sm">
        <Link to={`/courses/${data.course.slug}`} className="neuro-accent">
          {data.course.title}
        </Link>
        {' / '}
        <Link to={monthPath} className="neuro-accent">
          {data.module.title}
        </Link>
      </p>
      <h1 className="neuro-text text-3xl font-extrabold">{data.lesson.title}</h1>

      {!data.unlocked ? (
        <div className="neuro-pressed space-y-2 rounded-3xl p-6">
          <h2 className="neuro-text text-2xl font-extrabold">الفيديو ظاهر ومقفول</h2>
          <p className="neuro-text-muted leading-8">
            {lockLabel(
              data.lesson.available_at && new Date(data.lesson.available_at).getTime() > Date.now()
                ? 'schedule'
                : data.lesson.available_at
                  ? 'assignment'
                  : 'schedule',
              data.lesson.available_at,
            )}
          </p>
        </div>
      ) : null}

      {data.unlocked && data.lesson.video_visible && data.lesson.video_id ? (
        <YouTubePlayer
          videoId={data.lesson.video_id}
          title={data.lesson.video_title ?? data.lesson.title}
          startAt={Number(data.progress?.last_position ?? 0)}
          watermarkText={
            watermark?.enabled && profile?.full_name
              ? `${profile.full_name}${profile.phone ? ` · ${profile.phone.slice(-4)}` : ''}`
              : null
          }
          watermarkPosition={watermark?.position}
          onProgress={persistProgress}
          onAction={reportSecurityEvent}
        />
      ) : null}

      {data.unlocked && data.lesson.pdf_visible && data.resources.length ? (
        <section className="neuro-raised-sm rounded-3xl p-5">
          <h2 className="neuro-text mb-3 font-bold">الملفات</h2>
          {data.resources.map((item) => (
            <Button
              key={item.id}
              variant="raised"
              onClick={async () => {
                const url = await signedUrl({ bucket: 'course-resources', path: item.file_path })
                if ('data' in url && url.data) window.open(url.data, '_blank')
              }}
            >
              {item.title}
            </Button>
          ))}
        </section>
      ) : null}

      {data.unlocked && data.lesson.editor_visible ? (
        <WebEditor
          html={code.html}
          css={code.css}
          js={code.js}
          onChange={setCode}
          onSave={() => {
            if (user) void saveCode({ lessonId, studentId: user.id, ...code })
          }}
        />
      ) : null}

      {data.unlocked && data.lesson.assignment_visible && data.assignment ? (
        <section className="neuro-raised-sm space-y-4 rounded-3xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="neuro-text font-bold">{data.assignment.title}</h2>
            {submitted ? <span className="neuro-success-soft rounded-full px-3 py-1 text-xs font-bold">تم التسليم</span> : null}
          </div>
          {assignmentLoading ? <p className="neuro-text-muted text-sm">جاري تحميل الأسئلة...</p> : null}
          {!assignmentLoading && questions.length === 0 ? (
            <p className="neuro-text-muted text-sm">مفيش أسئلة على الواجب ده لسه. الأدمن يرفع ملف JSON من صفحة الدرس.</p>
          ) : null}
          {questions.map((question) => {
            const review = resultByQuestion[question.id]
            const current = answers[question.id]
            return (
              <div
                key={question.id}
                className={`rounded-2xl p-4 ${
                  review ? (review.is_correct ? 'bg-green-500/10' : 'bg-red-500/10') : 'neuro-pressed'
                }`}
              >
                <p className="neuro-text mb-3 font-semibold">{question.question_text}</p>
                {question.question_type === 'code_output' ? (
                  <input
                    className="neuro-input ltr-input w-full rounded-2xl px-4 py-3"
                    value={current?.text ?? ''}
                    disabled={submitted}
                    onChange={(event) =>
                      setAnswers((prev) => ({ ...prev, [question.id]: { text: event.target.value } }))
                    }
                  />
                ) : (
                  <div className="space-y-2">
                    {question.options?.map((option) => (
                      <label key={option.id} className="neuro-text flex items-center gap-2">
                        <input
                          type="radio"
                          name={question.id}
                          checked={current?.option_id === option.id}
                          disabled={submitted}
                          onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: { option_id: option.id } }))}
                        />
                        {option.option_text}
                      </label>
                    ))}
                  </div>
                )}
                {review ? (
                  <div className="mt-3 text-sm leading-7">
                    <p className={review.is_correct ? 'font-bold text-green-600' : 'font-bold text-red-500'}>
                      {review.is_correct ? 'إجابة صحيحة' : 'إجابة غلط'}
                    </p>
                    {!review.is_correct ? (
                      <p>
                        إجابتك: {review.selected_text || '—'} — الصح: {review.correct_text || '—'}
                      </p>
                    ) : null}
                    {review.explanation ? <p className="neuro-text-muted">{review.explanation}</p> : null}
                  </div>
                ) : null}
              </div>
            )
          })}
          {quizError ? <p className="text-sm text-red-500">{quizError}</p> : null}
          {submitted && result?.attempt ? (
            <div className="neuro-pressed rounded-2xl p-4">
              <p className="text-lg font-bold">
                النتيجة: {result.attempt.score} / {result.attempt.total_points} ({result.attempt.percentage}%)
                — الواجب اتسلم، والدرس اللي بعده اتفتح لو ميعاده وصل.
              </p>
            </div>
          ) : (
            <Button disabled={questions.length === 0} onClick={() => {
              setQuizError('')
              setConfirmSubmit(true)
            }}>
              تسليم الواجب
            </Button>
          )}
        </section>
      ) : null}

      {data.unlocked ? <Button onClick={() => void completeLesson(lessonId)}>إكمال الدرس</Button> : null}

      {data.unlocked ? (
        <LessonChat
          messages={discussions}
          currentUserId={user?.id}
          onSend={async (body) => {
            if (!user) return
            await addDiscussion({ lesson_id: lessonId, author_id: user.id, body })
          }}
          onEdit={async (id, body) => {
            await updateDiscussion({ id, body })
          }}
          onDelete={async (id) => {
            await deleteDiscussion(id)
          }}
        />
      ) : null}

      <ConfirmDialog
        open={confirmSubmit}
        title="تسليم الواجب؟"
        text="بعد الإرسال هتشوف النتيجة، والدرس اللي بعده هيتفتح حتى لو الدرجة صفر."
        onClose={() => setConfirmSubmit(false)}
        onConfirm={async () => {
          setConfirmSubmit(false)
          const response = await submitAssignment({ assignmentId: data.assignment!.id, answers })
          if ('error' in response) {
            const message =
              response.error && typeof response.error === 'object' && 'data' in response.error
                ? String(response.error.data)
                : 'حصل خطأ أثناء التسليم.'
            setQuizError(message.includes('max attempts') ? 'وصلت للحد الأقصى من المحاولات.' : 'حصل خطأ أثناء التسليم.')
            return
          }
          const submittedResult = response.data as QuizResult
          setResult(submittedResult)
          if (data.assignment?.id) localStorage.removeItem(draftKey(data.assignment.id))
        }}
      />
    </div>
  )
}

function Locked({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="neuro-raised rounded-[2rem] p-8 text-center">
      <h1 className="neuro-text text-3xl font-extrabold">{title}</h1>
      <p className="neuro-text-muted mt-3">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
