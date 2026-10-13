import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { gradeLabel } from '@/lib/labels'
import { useGetSessionsQuery, useSaveSessionMutation } from '@/store/api/adminApi'

const grades = [
  { value: '', label: 'كل السنوات' },
  { value: 'sec-1', label: 'أولى ثانوي' },
  { value: 'sec-2', label: 'تانية بكالوريا' },
]

export function LiveSessionsPage() {
  const { data = [], refetch } = useGetSessionsQuery()
  const [save, { isLoading }] = useSaveSessionMutation()
  const [title, setTitle] = useState('')
  const [starts, setStarts] = useState('')
  const [url, setUrl] = useState('')
  const [grade, setGrade] = useState('')
  const [error, setError] = useState('')

  return (
    <div className="space-y-5">
      <form
        className="neuro-raised grid gap-3 rounded-3xl p-5 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          void save({
            title,
            starts_at: starts,
            join_url: url,
            grade: grade || null,
            is_published: true,
          }).then((result) => {
            if ('error' in result) {
              setError('حصل خطأ أثناء حفظ اللايف. لو العمود الجديد مش متعمل، شغّل ملف 00011 في Supabase.')
              return
            }
            setTitle('')
            setUrl('')
            setGrade('')
            void refetch()
          })
        }}
      >
        <Input label="عنوان الجلسة" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <Input label="الموعد" type="datetime-local" value={starts} onChange={(event) => setStarts(event.target.value)} required />
        <Input label="رابط الانضمام" value={url} onChange={(event) => setUrl(event.target.value)} ltr />
        <label className="block space-y-2">
          <span className="text-sm font-semibold">السنة المستهدفة</span>
          <select className="neuro-input w-full rounded-2xl px-4 py-3" value={grade} onChange={(event) => setGrade(event.target.value)}>
            {grades.map((item) => (
              <option key={item.value || 'all'} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="text-sm text-red-500 md:col-span-2">{error}</p> : null}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'بيتحفظ...' : 'إضافة لايف'}
        </Button>
      </form>
      {data.map((session) => (
        <article key={session.id} className="neuro-raised-sm rounded-3xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="neuro-text font-bold">{session.title}</h3>
            <span className="neuro-accent-soft rounded-full px-3 py-1 text-xs font-bold">{gradeLabel(session.grade)}</span>
          </div>
          <p className="neuro-text-muted mt-2 text-sm">{new Date(session.starts_at).toLocaleString('ar-EG')}</p>
          {session.join_url ? (
            <a href={session.join_url} className="mt-2 inline-block text-sm neuro-accent" target="_blank" rel="noreferrer">
              رابط الانضمام
            </a>
          ) : null}
        </article>
      ))}
      {data.length === 0 ? <p className="neuro-text-muted">مفيش جلسات لايف لسه.</p> : null}
    </div>
  )
}
