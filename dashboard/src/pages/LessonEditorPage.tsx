import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'
import { firstRelation } from '@/lib/labels'
import { storageFileName } from '@/lib/storage-key'
import { getSupabase } from '@/lib/supabase'
import { useAppSelector } from '@/store/hooks'
import {
  useAddLessonChatMutation,
  useDeleteLessonMutation,
  useGetLessonBundleQuery,
  useGetLessonChatsQuery,
  useSaveAssignmentMutation,
  useSaveEditorMutation,
  useSaveLessonMutation,
  useSaveQuestionMutation,
  useUploadPdfMutation,
  useYoutubeUploadMutation,
  useImportQuestionsMutation,
} from '@/store/api/adminApi'
import { extractYoutubeId, type Assignment, type EditorBlock, type Lesson, type LessonResource, type Question } from '@/types/models'

function toDatetimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function LessonEditorPage() {
  const { lessonId = '' } = useParams()
  const { data, refetch, isLoading, isError } = useGetLessonBundleQuery(lessonId, { skip: !lessonId })
  if (isLoading) return <p className="neuro-text-muted">جاري التحميل...</p>
  if (isError || !data) {
    return (
      <div className="neuro-raised-sm space-y-3 rounded-3xl p-5">
        <p className="neuro-text text-lg font-bold">الدرس مش موجود</p>
        <p className="neuro-text-muted text-sm">ممكن يكون اتمسح، أو الرابط غلط.</p>
      </div>
    )
  }
  return <LessonEditorInner data={data} refetch={refetch} />
}

function LessonEditorInner({
  data,
  refetch,
}: {
  data: {
    lesson: Lesson
    resources: LessonResource[]
    editor: EditorBlock | null
    assignment: Assignment | null
    questions: Question[]
  }
  refetch: () => unknown
}) {
  const { lesson } = data
  const [saveLesson] = useSaveLessonMutation()
  const [saveEditor] = useSaveEditorMutation()
  const [uploadPdf] = useUploadPdfMutation()
  const [saveAssignment] = useSaveAssignmentMutation()
  const [saveQuestion] = useSaveQuestionMutation()
  const [youtubeUpload] = useYoutubeUploadMutation()
  const [importQuestions] = useImportQuestionsMutation()
  const [deleteLesson] = useDeleteLessonMutation()
  const [addChat] = useAddLessonChatMutation()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const { data: chats = [] } = useGetLessonChatsQuery(lesson.id, { pollingInterval: 8000 })
  const [tab, setTab] = useState<'manual' | 'api'>('manual')
  const [youtubeInput, setYoutubeInput] = useState('')
  const [html, setHtml] = useState(data.editor?.html ?? '')
  const [css, setCss] = useState(data.editor?.css ?? '')
  const [js, setJs] = useState(data.editor?.js ?? '')
  const [message, setMessage] = useState('')
  const [jsonText, setJsonText] = useState('')
  const [availableAt, setAvailableAt] = useState(toDatetimeLocal(lesson.available_at))
  const [reply, setReply] = useState('')
  const [confirm, setConfirm] = useState<'publish' | 'delete' | null>(null)

  async function attachManual() {
    const id = extractYoutubeId(youtubeInput)
    if (!id) {
      setMessage('الرابط أو الـ ID مش صحيح')
      return
    }
    let title = `YouTube ${id}`
    let thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`
    try {
      const oembed = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
      if (oembed.ok) {
        const json = await oembed.json()
        title = json.title
        thumbnail = json.thumbnail_url
      }
    } catch {
      /* fallback thumbnail */
    }
    await saveLesson({
      ...lesson,
      title: lesson.title,
      module_id: lesson.module_id,
      video_id: id,
      video_provider: 'youtube',
      upload_method: 'manual',
      video_title: title,
      video_thumbnail: thumbnail,
    })
    setMessage('الفيديو اتربط')
    void refetch()
  }

  async function attachApi(file: File) {
    const supabase = getSupabase()
    const path = `youtube-upload/${lesson.id}/${storageFileName(file.name)}`
    const upload = await supabase.storage.from('course-resources').upload(path, file)
    if (upload.error) {
      setMessage(upload.error.message)
      return
    }
    const result = await youtubeUpload({ path, title: lesson.title })
    if ('error' in result && result.error) {
      setMessage('الرفع على يوتيوب فشل. استخدم لصق الرابط أو اربط القناة من الإعدادات.')
      return
    }
    const payload = result.data
    await saveLesson({
      ...lesson,
      title: lesson.title,
      module_id: lesson.module_id,
      video_id: payload?.video_id,
      video_provider: 'youtube',
      upload_method: 'api',
      video_title: payload?.title ?? lesson.title,
      video_thumbnail: payload?.thumbnail,
    })
    setMessage('الفيديو اترفع على يوتيوب')
    void refetch()
  }

  return (
    <div className="space-y-5">
      <div className="neuro-raised flex flex-wrap items-center justify-between gap-3 rounded-3xl p-5">
        <h2 className="neuro-text text-2xl font-extrabold">{lesson.title}</h2>
        <div className="flex gap-2">
          <Button variant="raised" onClick={() => setConfirm('publish')}>
            {lesson.is_published ? 'إخفاء الدرس' : 'نشر الدرس'}
          </Button>
          <Button variant="ghost" onClick={() => setConfirm('delete')}>
            حذف الدرس
          </Button>
        </div>
      </div>

      <section className="neuro-raised-sm space-y-3 rounded-3xl p-5">
        <h3 className="neuro-text font-bold">ميعاد فتح الدرس للطلاب</h3>
        <p className="neuro-text-muted text-sm">
          {lesson.order_index === 0
            ? 'أول درس في الشهر يظهر في القائمة، والفيديو بيتفتح بعد الميعاد من غير واجب قبله.'
            : 'الدرس يظهر في القائمة، والفيديو يفضل مقفول لحد الميعاد وبعد ما الطالب يسلّم واجب الدرس اللي قبله — حتى لو جاب صفر.'}
        </p>
        <Input
          label="تاريخ ووقت الفتح"
          type="datetime-local"
          value={availableAt}
          onChange={(event) => setAvailableAt(event.target.value)}
        />
        <Button
          onClick={() =>
            void saveLesson({
              ...lesson,
              title: lesson.title,
              module_id: lesson.module_id,
              available_at: availableAt ? new Date(availableAt).toISOString() : new Date().toISOString(),
            }).then(() => setMessage('تم تحديد ميعاد الفتح'))
          }
        >
          فتح الدرس من الميعاد ده
        </Button>
      </section>

      <section className="neuro-raised-sm rounded-3xl p-5">
        <div className="mb-4 flex gap-2">
          <Button variant={tab === 'manual' ? 'primary' : 'raised'} onClick={() => setTab('manual')}>
            لصق رابط يوتيوب
          </Button>
          <Button variant={tab === 'api' ? 'primary' : 'raised'} onClick={() => setTab('api')}>
            رفع من المنصة
          </Button>
        </div>
        {tab === 'manual' ? (
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              label="رابط أو Video ID"
              value={youtubeInput}
              onChange={(event) => setYoutubeInput(event.target.value)}
              ltr
            />
            <div className="flex items-end">
              <Button onClick={() => void attachManual()}>ربط الفيديو</Button>
            </div>
          </div>
        ) : (
          <input
            type="file"
            accept="video/*"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void attachApi(file)
            }}
          />
        )}
        {lesson.video_id ? <p className="mt-3 text-sm neuro-accent">الفيديو الحالي: {lesson.video_id}</p> : null}
        {message ? <p className="mt-3 text-sm neuro-accent">{message}</p> : null}
      </section>

      <section className="neuro-raised-sm rounded-3xl p-5">
        <h3 className="neuro-text mb-3 font-bold">ملف PDF</h3>
        <input
          type="file"
          accept="application/pdf"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void uploadPdf({ lesson, file, title: file.name })
          }}
        />
        <ul className="neuro-text-muted mt-3 text-sm">
          {data.resources.map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      </section>

      <section className="neuro-raised-sm space-y-3 rounded-3xl p-5">
        <h3 className="neuro-text font-bold">محرر HTML / CSS / JS</h3>
        <textarea className="neuro-input ltr-input min-h-24 w-full rounded-2xl p-3" placeholder="HTML" value={html} onChange={(event) => setHtml(event.target.value)} />
        <textarea className="neuro-input ltr-input min-h-24 w-full rounded-2xl p-3" placeholder="CSS" value={css} onChange={(event) => setCss(event.target.value)} />
        <textarea className="neuro-input ltr-input min-h-24 w-full rounded-2xl p-3" placeholder="JS" value={js} onChange={(event) => setJs(event.target.value)} />
        <div className="flex gap-2">
          <Button
            onClick={() =>
              void saveEditor({
                lesson_id: lesson.id,
              html: html,
              css: css,
              js: js,
              })
            }
          >
            حفظ المحرر
          </Button>
          <Button
            variant="raised"
            onClick={() => void saveLesson({ ...lesson, title: lesson.title, module_id: lesson.module_id, editor_visible: !lesson.editor_visible })}
          >
            {lesson.editor_visible ? 'إخفاء المحرر' : 'إظهار المحرر'}
          </Button>
        </div>
      </section>

      <section className="neuro-raised-sm space-y-3 rounded-3xl p-5">
        <h3 className="neuro-text font-bold">الواجب</h3>
        <Button
          onClick={() =>
            void saveAssignment({
              id: data.assignment?.id,
              lesson_id: lesson.id,
              title: `واجب ${lesson.title}`,
              is_published: true,
              is_required: true,
              passing_score: 50,
            }).then(() =>
              saveLesson({
                ...lesson,
                title: lesson.title,
                module_id: lesson.module_id,
                assignment_visible: true,
              }),
            )
          }
        >
          {data.assignment ? 'تحديث الواجب' : 'إنشاء واجب'}
        </Button>
        {data.assignment ? <QuestionForm assignmentId={data.assignment.id} onSave={saveQuestion} /> : null}
        {data.assignment ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold">استيراد أسئلة JSON</p>
            <p className="neuro-text-muted text-sm">
              أنشئ الواجب الأول، ارفع الملف أو الصق JSON، وبعدين اضغط رفع. لو الرفع نجح هتشوف الأسئلة تحت هنا.
            </p>
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
                  const result = await importQuestions({ assignmentId: data.assignment!.id, payload })
                  if ('error' in result) {
                    const err = result.error as { data?: unknown; message?: string } | undefined
                    setMessage(String(err?.data || err?.message || 'ملف JSON مش سليم'))
                  } else {
                    setMessage(`اتضاف ${result.data} سؤال`)
                    setJsonText('')
                    void refetch()
                  }
                } catch {
                  setMessage('ملف JSON مش سليم')
                }
              }}
            >
              رفع ملف الأسئلة
            </Button>
          </div>
        ) : null}
        <ul className="space-y-2 text-sm">
          {data.questions.map((question) => (
            <li key={question.id} className="neuro-pressed rounded-2xl px-4 py-3">
              {question.question_text}
            </li>
          ))}
        </ul>
      </section>

      <section className="neuro-raised-sm space-y-3 rounded-3xl p-5">
        <h3 className="neuro-text font-bold">شات الطلاب</h3>
        <div className="max-h-80 space-y-2 overflow-auto">
          {[...chats].reverse().map((item) => {
            const profile = firstRelation(item.profiles)
            const staff = profile?.role === 'admin' || profile?.role === 'teacher'
            return (
              <p key={item.id} className={`rounded-2xl p-3 ${staff ? 'bg-blue-500/10' : 'neuro-pressed'}`}>
                <strong>{profile?.full_name ?? 'مستخدم'}{staff ? ' — المدرس' : ''}: </strong>
                {item.body}
              </p>
            )
          })}
        </div>
        <textarea className="neuro-input min-h-24 w-full rounded-2xl p-3" value={reply} onChange={(event) => setReply(event.target.value)} />
        <Button
          onClick={() => {
            if (!user || !reply.trim()) return
            void addChat({ lesson_id: lesson.id, author_id: user.id, body: reply.trim() }).then(() => setReply(''))
          }}
        >
          إرسال الرد
        </Button>
      </section>

      <ConfirmDialog
        open={confirm === 'publish'}
        title={lesson.is_published ? 'إخفاء الدرس؟' : 'نشر الدرس؟'}
        text="هيتغير ظهور الدرس للطلاب."
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          void saveLesson({
            ...lesson,
            title: lesson.title,
            module_id: lesson.module_id,
            is_published: !lesson.is_published,
          })
          setConfirm(null)
        }}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        title="حذف الدرس؟"
        text="الفيديو والواجب والأسئلة هتتمسح."
        confirmLabel="حذف"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          void deleteLesson(lesson.id).then(() => navigate('/courses'))
        }}
      />
    </div>
  )
}

function QuestionForm({
  assignmentId,
  onSave,
}: {
  assignmentId: string
  onSave: ReturnType<typeof useSaveQuestionMutation>[0]
}) {
  const [text, setText] = useState('')
  const [correct, setCorrect] = useState('أ')

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave({
          assignment_id: assignmentId,
          question_text: text,
          question_type: 'multiple_choice',
          points: 1,
          explanation: 'راجع الدرس',
          options: [
            { option_text: 'أ', is_correct: correct === 'أ' },
            { option_text: 'ب', is_correct: correct === 'ب' },
            { option_text: 'ج', is_correct: correct === 'ج' },
          ],
        }).then(() => setText(''))
      }}
    >
      <Input label="نص السؤال" value={text} onChange={(event) => setText(event.target.value)} required />
      <Input label="الإجابة الصحيحة (أ / ب / ج)" value={correct} onChange={(event) => setCorrect(event.target.value)} />
      <Button type="submit">إضافة سؤال</Button>
    </form>
  )
}
