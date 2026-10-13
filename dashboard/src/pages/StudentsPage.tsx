import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useGetStudentsQuery, useNotifyStudentsMutation } from '@/store/api/adminApi'
import type { StudentProfile } from '@/types/models'

const grades = [
  { value: '', label: 'كل الصفوف' },
  { value: 'sec-1', label: 'أولى ثانوي' },
  { value: 'sec-2', label: 'تانية بكالوريا' },
]

function gradeLabel(value: string | null) {
  if (value === 'sec-2') return 'تانية بكالوريا'
  if (value === 'sec-1') return 'أولى ثانوي'
  return value ?? '—'
}

export function StudentsPage() {
  const { data = [] } = useGetStudentsQuery()
  const [notify, notifyState] = useNotifyStudentsMutation()
  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState('')
  const [selected, setSelected] = useState<StudentProfile | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [message, setMessage] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim()
    return data.filter((item) => {
      if (grade && item.grade !== grade) return false
      if (!q) return true
      return [item.full_name, item.phone, item.school, item.governorate].some((value) =>
        (value ?? '').includes(q),
      )
    })
  }, [data, grade, search])

  async function send(userId?: string, forGrade?: string) {
    if (!title.trim() || !body.trim()) {
      setMessage('اكتب عنوان ونص الإشعار')
      return
    }
    const result = await notify({ title: title.trim(), body: body.trim(), userId, grade: forGrade })
    if ('error' in result) setMessage('فشل الإرسال')
    else setMessage(`تم إرسال ${result.data} إشعار`)
  }

  return (
    <div className="space-y-5">
      <section className="neuro-raised grid gap-3 rounded-3xl p-5 md:grid-cols-3">
        <Input label="بحث" value={search} onChange={(event) => setSearch(event.target.value)} />
        <label className="block space-y-2">
          <span className="text-sm font-semibold">الصف</span>
          <select className="neuro-input w-full rounded-2xl px-4 py-3" value={grade} onChange={(event) => setGrade(event.target.value)}>
            {grades.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button
            onClick={() => void send(undefined, grade || undefined)}
            disabled={notifyState.isLoading}
          >
            إرسال حسب الصف المختار
          </Button>
        </div>
        <Input label="عنوان الإشعار" value={title} onChange={(event) => setTitle(event.target.value)} />
        <div className="md:col-span-2">
          <Input label="نص الإشعار" value={body} onChange={(event) => setBody(event.target.value)} />
        </div>
        {message ? <p className="text-sm neuro-accent md:col-span-3">{message}</p> : null}
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((student) => (
          <button
            key={student.id}
            type="button"
            className="neuro-raised-sm neuro-hover rounded-3xl p-5 text-right"
            onClick={() => setSelected(student)}
          >
            <p className="text-sm neuro-accent">{gradeLabel(student.grade)}</p>
            <h3 className="neuro-text mt-1 text-lg font-bold">{student.full_name}</h3>
            <p className="neuro-text-muted mt-2 text-sm">{student.phone}</p>
            <p className="neuro-text-muted text-sm">{student.governorate} — {student.school}</p>
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <p className="neuro-text-muted">مفيش طلاب مطابقين.</p> : null}

      <Modal open={Boolean(selected)} title="بيانات الطالب" onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-2 text-sm">
            <p><strong>الاسم:</strong> {selected.full_name}</p>
            <p><strong>التليفون:</strong> {selected.phone}</p>
            <p><strong>الصف:</strong> {gradeLabel(selected.grade)}</p>
            <p><strong>المدرسة:</strong> {selected.school ?? '—'}</p>
            <p><strong>المدينة:</strong> {selected.city ?? '—'}</p>
            <p><strong>المحافظة:</strong> {selected.governorate ?? '—'}</p>
            <div className="pt-3">
              <Button onClick={() => void send(selected.id)}>إرسال إشعار للطالب ده</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
