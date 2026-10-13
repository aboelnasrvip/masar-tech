import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { firstRelation, formatDateTime, gradeLabel } from '@/lib/labels'
import {
  useGetExamAttemptsQuery,
  useGetExamsQuery,
  useImportExamQuestionsMutation,
  useSaveExamMutation,
} from '@/store/api/adminApi'
import type { Exam } from '@/types/models'

const grades = [
  { value: '', label: 'كل السنوات' },
  { value: 'sec-1', label: 'أولى ثانوي' },
  { value: 'sec-2', label: 'تانية بكالوريا' },
]

function toLocalInput(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function ExamsAdminPage() {
  const { data: exams = [], refetch } = useGetExamsQuery()
  const { data: attempts = [] } = useGetExamAttemptsQuery()
  const [saveExam, saveState] = useSaveExamMutation()
  const [importQuestions] = useImportExamQuestionsMutation()
  const [editing, setEditing] = useState<Exam | 'new' | null>('new')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [grade, setGrade] = useState('')
  const [starts, setStarts] = useState('')
  const [duration, setDuration] = useState('10')
  const [published, setPublished] = useState(true)
  const [jsonText, setJsonText] = useState('')
  const [message, setMessage] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => attempts.find((item) => item.id === selectedId) ?? null, [attempts, selectedId])
  const selectedProfile = selected ? firstRelation(selected.profiles) : null
  const selectedExam = selected ? firstRelation(selected.exams) : null
  const current = editing && editing !== 'new' ? editing : null

  function fill(exam: Exam | 'new' | null) {
    setEditing(exam)
    setMessage('')
    if (!exam || exam === 'new') {
      setTitle('')
      setDescription('')
      setGrade('')
      setStarts('')
      setDuration('10')
      setPublished(true)
      setJsonText('')
      return
    }
    setTitle(exam.title)
    setDescription(exam.description ?? '')
    setGrade(exam.grade ?? '')
    setStarts(toLocalInput(exam.starts_at))
    setDuration(String(exam.duration_minutes))
    setPublished(exam.is_published)
  }

  return (
    <div className="space-y-5">
      <form
        className="neuro-raised grid gap-3 rounded-3xl p-5 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          setMessage('')
          void saveExam({
            id: current?.id,
            title,
            description,
            grade: grade || null,
            starts_at: new Date(starts).toISOString(),
            duration_minutes: Number(duration) || 10,
            is_published: published,
          }).then((result) => {
            if ('error' in result) {
              setMessage('حصل خطأ أثناء الحفظ. شغّل ملف 00012 في Supabase لو الجداول لسه متعملتش.')
              return
            }
            setMessage('الامتحان اتحفظ.')
            fill(result.data)
            void refetch()
          })
        }}
      >
        <h2 className="neuro-text text-xl font-extrabold md:col-span-2">{current ? 'تعديل امتحان' : 'امتحان جديد'}</h2>
        <Input label="عنوان الامتحان" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <label className="block space-y-2">
          <span className="text-sm font-semibold">السنة</span>
          <select className="neuro-input w-full rounded-2xl px-4 py-3" value={grade} onChange={(event) => setGrade(event.target.value)}>
            {grades.map((item) => (
              <option key={item.value || 'all'} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <Input label="موعد البداية" type="datetime-local" value={starts} onChange={(event) => setStarts(event.target.value)} required />
        <Input label="المدة بالدقائق" value={duration} onChange={(event) => setDuration(event.target.value)} ltr required />
        <label className="md:col-span-2 block space-y-2">
          <span className="text-sm font-semibold">وصف</span>
          <textarea className="neuro-input min-h-20 w-full rounded-2xl p-3" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} />
          نشر للطلاب
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={saveState.isLoading}>
            حفظ الامتحان
          </Button>
          {current ? (
            <Button type="button" variant="raised" onClick={() => fill('new')}>
              امتحان جديد
            </Button>
          ) : null}
        </div>
        {message ? <p className="text-sm neuro-accent md:col-span-2">{message}</p> : null}
      </form>

      {current ? (
        <section className="neuro-raised-sm space-y-3 rounded-3xl p-5">
          <h3 className="neuro-text font-bold">أسئلة الامتحان (JSON زي الواجب)</h3>
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (event) => {
              const text = await event.target.files?.[0]?.text()
              if (text) setJsonText(text)
            }}
          />
          <textarea
            className="neuro-input ltr-input min-h-32 w-full rounded-2xl p-3 text-sm"
            placeholder='{"questions":[{"question_text":"...","question_type":"multiple_choice","points":1,"options":[{"option_text":"أ","is_correct":true}]}]}'
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
          />
          <Button
            variant="raised"
            onClick={async () => {
              try {
                const payload = JSON.parse(jsonText)
                const result = await importQuestions({ examId: current.id, payload })
                if ('error' in result) {
                  setMessage('ملف JSON مش سليم أو الجداول لسه متعملتش.')
                  return
                }
                setMessage(`اتضاف ${result.data} سؤال`)
                setJsonText('')
                void refetch()
              } catch {
                setMessage('ملف JSON مش سليم')
              }
            }}
          >
            رفع الأسئلة
          </Button>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="neuro-text text-xl font-extrabold">الامتحانات</h2>
        {exams.map((exam) => (
          <button
            key={exam.id}
            type="button"
            className="neuro-raised-sm w-full rounded-3xl p-5 text-right"
            onClick={() => fill(exam)}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">{exam.title}</p>
              <span className="neuro-accent-soft rounded-full px-3 py-1 text-xs font-bold">{gradeLabel(exam.grade)}</span>
            </div>
            <p className="neuro-text-muted mt-2 text-sm">
              {formatDateTime(exam.starts_at)} — {exam.duration_minutes} دقيقة — {exam.exam_questions?.length ?? 0} سؤال
              {exam.is_published ? ' — منشور' : ' — مسودة'}
            </p>
          </button>
        ))}
        {exams.length === 0 ? <p className="neuro-text-muted">لسه مفيش امتحانات.</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="neuro-text text-xl font-extrabold">نتائج الطلاب</h2>
        <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {attempts.map((item) => {
            const profile = firstRelation(item.profiles)
            const exam = firstRelation(item.exams)
            return (
              <button
                key={item.id}
                type="button"
                className="neuro-raised-sm neuro-hover flex h-full flex-col rounded-3xl p-5 text-right"
                onClick={() => setSelectedId(item.id)}
              >
                <p className="text-sm neuro-accent">
                  {item.passed ? 'ناجح' : 'اتسلم'} — {item.percentage}%
                  {item.auto_submitted ? ' — تلقائي' : ''}
                </p>
                <h3 className="neuro-text mt-1 text-lg font-bold">{profile?.full_name ?? 'طالب'}</h3>
                <p className="neuro-text-muted mt-2 flex-1 text-sm">{exam?.title ?? 'امتحان'}</p>
                <p className="mt-3 font-bold neuro-accent">
                  {item.score} / {item.total_points}
                </p>
              </button>
            )
          })}
        </div>
        {attempts.length === 0 ? <p className="neuro-text-muted">لسه مفيش تسليمات امتحان.</p> : null}
      </section>

      <Modal open={Boolean(selected)} title="تفاصيل الامتحان" onClose={() => setSelectedId(null)}>
        {selected ? (
          <div className="space-y-3">
            <p>
              <strong>الطالب:</strong> {selectedProfile?.full_name} — {selectedProfile?.phone}
            </p>
            <p>
              <strong>الامتحان:</strong> {selectedExam?.title}
            </p>
            <p>
              <strong>النتيجة:</strong> {selected.score} / {selected.total_points} ({selected.percentage}%)
            </p>
            <p>
              <strong>التسليم:</strong> {selected.auto_submitted ? 'تلقائي بعد انتهاء الوقت' : 'يدوي'}
            </p>
            {(selected.exam_answers ?? []).map((answer, index) => {
              const question = firstRelation(answer.questions)
              return (
                <div key={`${selected.id}-${index}`} className={`rounded-2xl p-3 ${answer.is_correct ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <p className="font-semibold">{question?.question_text}</p>
                  <p className="mt-1 text-sm">
                    {answer.is_correct ? 'صح' : 'غلط'}
                    {answer.answer_text ? ` — ${answer.answer_text}` : ''}
                  </p>
                  {question?.explanation ? <p className="neuro-text-muted mt-1 text-sm">{question.explanation}</p> : null}
                </div>
              )
            })}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
