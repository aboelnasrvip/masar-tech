import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Pause, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { firstRelation, parseCopyDetail, securityEventLabel } from '@/lib/labels'
import { useDeleteSecurityEventsMutation, useGetSecurityEventsQuery } from '@/store/api/adminApi'

const filters = [
  { value: 'all', label: 'كل الحركات' },
  { value: 'copy', label: 'نسخ' },
  { value: 'shortcut_inspect', label: 'Inspect' },
  { value: 'contextmenu', label: 'كليك يمين' },
  { value: 'video_play', label: 'تشغيل' },
  { value: 'video_pause', label: 'إيقاف' },
  { value: 'video_seek', label: 'تحريك الفيديو' },
  { value: 'tab_hidden', label: 'ساب الصفحة' },
  { value: 'lesson_open', label: 'فتح درس' },
  { value: 'print', label: 'طباعة' },
]

export function SecurityStudentPage() {
  const { studentId = '' } = useParams()
  const [polling, setPolling] = useState(true)
  const [filter, setFilter] = useState('all')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { data = [], isLoading, error } = useGetSecurityEventsQuery(studentId, {
    skip: !studentId,
    pollingInterval: polling ? 10000 : 0,
  })
  const [deleteEvents, deleteState] = useDeleteSecurityEventsMutation()
  const profile = firstRelation(data[0]?.profiles)
  const items = useMemo(
    () => (filter === 'all' ? data : data.filter((item) => item.event_type === filter)),
    [data, filter],
  )

  return (
    <div className="space-y-4">
      <p className="neuro-text-muted text-sm">
        <Link to="/security" className="neuro-accent font-semibold">
          أحداث الحماية
        </Link>
        {' / '}
        {profile?.full_name ?? 'طالب'}
      </p>
      <div className="neuro-raised-sm flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4">
        <div>
          <h2 className="neuro-text text-2xl font-extrabold">{profile?.full_name ?? 'سجل الطالب'}</h2>
          <p className="neuro-text-muted text-sm">{profile?.phone ?? ''}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="raised" onClick={() => setPolling((value) => !value)}>
            {polling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {polling ? 'إيقاف التحديث' : 'تشغيل التحديث'}
          </Button>
          <Button variant="ghost" disabled={data.length === 0} onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" />
            حذف سجل الطالب
          </Button>
        </div>
      </div>
      <label className="block max-w-xs space-y-2">
        <span className="neuro-text text-sm font-semibold">تصفية</span>
        <select className="neuro-input w-full rounded-2xl px-4 py-3" value={filter} onChange={(event) => setFilter(event.target.value)}>
          {filters.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      {isLoading ? <p className="neuro-text-muted">جاري التحميل...</p> : null}
      {error ? <p className="text-sm text-red-500">تعذر تحميل السجل.</p> : null}
      <div className="space-y-3">
        {items.map((item) => {
          const lesson = firstRelation(item.lessons)
          return (
            <article key={item.id} className="neuro-raised-sm rounded-3xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-sm font-semibold neuro-warning">{securityEventLabel(item.event_type)}</p>
                <p className="text-xs neuro-text-muted">{new Date(item.created_at).toLocaleString('ar-EG')}</p>
              </div>
              {item.event_type === 'copy' ? (
                <CopyEventBody detail={item.detail} pageUrl={item.page_url} />
              ) : (
                <p className="neuro-text mt-2 whitespace-pre-wrap leading-7">{item.detail || '—'}</p>
              )}
              <p className="neuro-text-muted mt-2 text-sm">{lesson?.title ?? item.page_url ?? 'صفحة'}</p>
            </article>
          )
        })}
      </div>
      {!isLoading && items.length === 0 ? <p className="neuro-text-muted">مفيش حركات بالنوع ده.</p> : null}

      <ConfirmDialog
        open={confirmDelete}
        title="حذف سجل الطالب؟"
        text={`هتتمسح كل حركات "${profile?.full_name ?? 'الطالب'}" من الداتابيز.`}
        confirmLabel="حذف"
        busy={deleteState.isLoading}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          void deleteEvents(studentId).then(() => setConfirmDelete(false))
        }}
      />
    </div>
  )
}

function CopyEventBody({ detail, pageUrl }: { detail: string | null; pageUrl: string | null }) {
  const parsed = parseCopyDetail(detail)
  if (!parsed?.text) {
    return (
      <p className="neuro-text mt-3 text-sm leading-7">
        {parsed?.method || 'نسخ من غير نص ظاهر في التحديد'}
      </p>
    )
  }
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold neuro-text-muted">المحتوى اللي اتنسخ</p>
      <pre className="neuro-pressed overflow-x-auto whitespace-pre-wrap wrap-break-word rounded-2xl p-4 text-sm leading-7 neuro-text">
        {parsed.text}
      </pre>
      {parsed.method ? <p className="text-xs neuro-text-muted">{parsed.method}</p> : null}
      {parsed.page || pageUrl ? (
        <p className="text-xs neuro-text-muted break-all" dir="ltr">
          {parsed.page || pageUrl}
        </p>
      ) : null}
    </div>
  )
}
