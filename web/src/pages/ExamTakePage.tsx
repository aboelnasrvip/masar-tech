import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { answersFromAttempt, extractLastAttempt, extractQuizQuestions, type QuizResult } from '@/lib/quiz'
import { formatDateTime } from '@/lib/labels'
import { useGetExamQuery, useSubmitExamMutation } from '@/store/api/studentApi'

function formatCountdown(total: number) {
  const safe = Math.max(0, total)
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function draftKey(examId: string) {
  return `exam-answers:${examId}`
}

export function ExamTakePage() {
  const { examId = '' } = useParams()
  const { data, isLoading, refetch } = useGetExamQuery(examId, { skip: !examId, pollingInterval: 15000 })
  const [submitExam] = useSubmitExamMutation()
  const [answers, setAnswers] = useState<Record<string, { option_id?: string; text?: string }>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [confirmSend, setConfirmSend] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [error, setError] = useState('')
  const sending = useRef(false)
  const answersRef = useRef(answers)
  answersRef.current = answers

  const exam = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const questions = extractQuizQuestions(data)
  const started = Boolean(exam?.started)
  const startsAt = typeof exam?.starts_at === 'string' ? exam.starts_at : ''
  const duration = Number(exam?.duration_minutes ?? 0)
  const title = String(exam?.title ?? 'امتحان')

  useEffect(() => {
    const last = extractLastAttempt(data)
    if (last?.attempt) {
      setResult(last)
      setAnswers(answersFromAttempt(last))
      return
    }
    if (!examId) return
    try {
      const raw = localStorage.getItem(draftKey(examId))
      if (raw) setAnswers(JSON.parse(raw) as Record<string, { option_id?: string; text?: string }>)
    } catch {
      /* ignore */
    }
  }, [data, examId])

  useEffect(() => {
    if (!examId || result?.attempt) return
    localStorage.setItem(draftKey(examId), JSON.stringify(answers))
  }, [answers, examId, result?.attempt])

  useEffect(() => {
    if (!startsAt || !duration) return
    function tick() {
      const end = new Date(startsAt).getTime() + duration * 60 * 1000
      setRemaining(Math.max(0, Math.floor((end - Date.now()) / 1000)))
    }
    tick()
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [startsAt, duration])

  async function send(auto = false) {
    if (!examId || sending.current || result?.attempt) return
    sending.current = true
    const response = await submitExam({ examId, answers: answersRef.current, auto })
    sending.current = false
    if ('error' in response) {
      setError('حصل خطأ أثناء تسليم الامتحان.')
      return
    }
    setResult(response.data as QuizResult)
    setShowResult(false)
    localStorage.removeItem(draftKey(examId))
    void refetch()
  }

  useEffect(() => {
    if (!started || result?.attempt || remaining == null || remaining > 0 || !questions.length) return
    void send(true)
  }, [started, remaining, result?.attempt, questions.length])

  if (isLoading || !data) return <p className="neuro-text-muted">جاري التحميل...</p>
  if (!exam?.id) return <p className="neuro-text-muted">الامتحان مش موجود أو مش منشور.</p>

  const submitted = Boolean(result?.attempt)
  const resultByQuestion = Object.fromEntries((result?.answers ?? []).map((item) => [item.question_id, item]))

  if (!started) {
    return (
      <div className="neuro-raised mx-auto max-w-xl space-y-3 rounded-[2rem] p-8 text-center">
        <Clock className="mx-auto h-10 w-10 neuro-accent" />
        <h1 className="neuro-text text-3xl font-extrabold">{title}</h1>
        <p className="neuro-text-muted leading-7">الامتحان هيبدأ {formatDateTime(startsAt)}. ارجع في المعاد عشان تدخل.</p>
        <Link to="/exams" className="neuro-accent inline-block">
          الرجوع للامتحانات
        </Link>
      </div>
    )
  }

  if (submitted && !showResult) {
    return (
      <div className="neuro-raised mx-auto max-w-xl space-y-4 rounded-[2rem] p-8 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 neuro-accent" />
        <h1 className="neuro-text text-3xl font-extrabold">تم إرسال الامتحان</h1>
        <p className="neuro-text-muted">التسليم اتحفظ{result?.attempt && (result.attempt as { auto_submitted?: boolean }).auto_submitted ? ' تلقائي بعد انتهاء الوقت' : ''}.</p>
        <Button onClick={() => setShowResult(true)}>اضغط لعرض النتيجة</Button>
        <Link to="/exams" className="neuro-accent block text-sm">
          الرجوع للامتحانات
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="neuro-text text-3xl font-extrabold">{title}</h1>
          <p className="neuro-text-muted mt-1 text-sm">مدة الامتحان {duration} دقيقة</p>
        </div>
        {!submitted && remaining != null ? (
          <div className={`rounded-2xl px-4 py-2 font-mono text-2xl font-black ${remaining <= 30 ? 'bg-red-500/15 text-red-500' : 'neuro-accent-soft'}`}>
            {formatCountdown(remaining)}
          </div>
        ) : null}
      </div>

      {questions.map((question) => {
        const review = resultByQuestion[question.id]
        const current = answers[question.id]
        return (
          <div
            key={question.id}
            className={`rounded-2xl p-4 ${review ? (review.is_correct ? 'bg-green-500/10' : 'bg-red-500/10') : 'neuro-pressed'}`}
          >
            <p className="neuro-text mb-3 font-semibold">{question.question_text}</p>
            {question.question_type === 'code_output' ? (
              <input
                className="neuro-input ltr-input w-full rounded-2xl px-4 py-3"
                value={current?.text ?? ''}
                disabled={submitted}
                onChange={(event) => setAnswers((prev) => ({ ...prev, [question.id]: { text: event.target.value } }))}
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

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {submitted && result?.attempt ? (
        <div className="neuro-pressed rounded-2xl p-4">
          <p className="text-lg font-bold">
            النتيجة: {result.attempt.score} / {result.attempt.total_points} ({result.attempt.percentage}%)
          </p>
        </div>
      ) : (
        <Button disabled={questions.length === 0} onClick={() => setConfirmSend(true)}>
          تسليم الامتحان
        </Button>
      )}

      <ConfirmDialog
        open={confirmSend}
        title="تسليم الامتحان؟"
        text="بعد الإرسال مش هتقدر تعدّل الإجابات، وهتقدر تشوف النتيجة."
        confirmLabel="تأكيد الإرسال"
        onClose={() => setConfirmSend(false)}
        onConfirm={() => {
          setConfirmSend(false)
          void send(false)
        }}
      />
    </div>
  )
}
