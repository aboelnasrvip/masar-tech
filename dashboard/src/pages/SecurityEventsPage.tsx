import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'
import { firstRelation } from '@/lib/labels'
import { useDeleteSecurityEventsMutation, useGetSecurityEventsQuery } from '@/store/api/adminApi'

export function SecurityEventsPage() {
  const { data = [], isLoading, error } = useGetSecurityEventsQuery()
  const [deleteEvents, deleteState] = useDeleteSecurityEventsMutation()
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const students = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; phone: string; grade: string | null; count: number; lastAt: string }
    >()
    for (const item of data) {
      const profile = firstRelation(item.profiles)
      const current = map.get(item.student_id) ?? {
        id: item.student_id,
        name: profile?.full_name ?? 'طالب',
        phone: profile?.phone ?? '',
        grade: profile?.grade ?? null,
        count: 0,
        lastAt: item.created_at,
      }
      current.count += 1
      if (item.created_at > current.lastAt) current.lastAt = item.created_at
      map.set(item.student_id, current)
    }
    return [...map.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt))
  }, [data])

  const filtered = students.filter((student) => {
    const q = search.trim()
    if (!q) return true
    return student.name.includes(q) || student.phone.includes(q)
  })

  return (
    <div className="space-y-4">
      <p className="neuro-text-muted text-sm leading-7">اضغط على الطالب عشان تشوف سجل الحركات بتاعه بالتفصيل.</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-60 flex-1">
          <Input label="بحث بالاسم أو الرقم" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Button variant="ghost" disabled={data.length === 0} onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-4 w-4" />
          حذف كل السجلات
        </Button>
      </div>
      {isLoading ? <p className="neuro-text-muted">جاري التحميل...</p> : null}
      {error ? <p className="text-sm text-red-500">تعذر تحميل الأحداث. شغّل ملف SQL رقم 00009 لو الجدول لسه متعملش.</p> : null}
      <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {filtered.map((student) => (
          <Link
            key={student.id}
            to={`/security/${student.id}`}
            className="neuro-raised-sm neuro-hover flex h-full flex-col rounded-3xl p-5"
          >
            <h3 className="neuro-text text-xl font-bold">{student.name}</h3>
            <p className="neuro-text-muted mt-1 text-sm">{student.phone || '—'}</p>
            <p className="mt-3 text-sm font-semibold neuro-accent">{student.count} حركة</p>
            <p className="mt-auto pt-3 text-xs neuro-text-muted">آخر حركة: {new Date(student.lastAt).toLocaleString('ar-EG')}</p>
          </Link>
        ))}
      </div>
      {!isLoading && filtered.length === 0 ? <p className="neuro-text-muted">مفيش طلاب في السجل.</p> : null}

      <ConfirmDialog
        open={confirmDelete}
        title="حذف كل السجلات؟"
        text="هتتمسح أحداث الحماية لكل الطلاب من الداتابيز. مفيش رجوع بعد التأكيد."
        confirmLabel="حذف"
        busy={deleteState.isLoading}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          void deleteEvents().then(() => setConfirmDelete(false))
        }}
      />
    </div>
  )
}
