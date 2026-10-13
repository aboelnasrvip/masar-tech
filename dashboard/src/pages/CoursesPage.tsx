import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { CardGrid, ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EntityCard, PageHeader } from '@/components/ui/EntityCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useDeleteCourseMutation, useGetCoursesQuery, useSaveCourseMutation, useUploadCoverMutation } from '@/store/api/adminApi'
import type { Course } from '@/types/models'

const grades = [
  { value: 'sec-1', label: 'أولى ثانوي' },
  { value: 'sec-2', label: 'تانية بكالوريا' },
]

function gradeLabel(grade: string | null) {
  return grades.find((item) => item.value === grade)?.label ?? 'أولى ثانوي'
}

export function CoursesPage() {
  const { data: courses = [] } = useGetCoursesQuery()
  const [save, { isLoading }] = useSaveCourseMutation()
  const [deleteCourse] = useDeleteCourseMutation()
  const [uploadCover] = useUploadCoverMutation()
  const [modal, setModal] = useState<Course | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Course | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [grade, setGrade] = useState('sec-1')
  const [imageUrl, setImageUrl] = useState('')
  const [published, setPublished] = useState(false)

  useEffect(() => {
    if (!modal) return
    if (modal === 'new') {
      setTitle('')
      setDescription('')
      setGrade('sec-1')
      setImageUrl('')
      setPublished(false)
      return
    }
    setTitle(modal.title)
    setDescription(modal.description ?? '')
    setGrade(modal.grade ?? 'sec-1')
    setImageUrl(modal.image_url ?? '')
    setPublished(modal.status === 'published')
  }, [modal])

  const editing = modal && modal !== 'new' ? modal : null

  return (
    <div className="space-y-5">
      <PageHeader title="الكورسات" onAdd={() => setModal('new')} addLabel="إضافة كورس" />

      <CardGrid>
        {courses.map((course) => (
          <EntityCard
            key={course.id}
            to={`/courses/${course.id}`}
            title={course.title}
            subtitle={gradeLabel(course.grade)}
            description={course.description}
            imageUrl={course.image_url}
            visible={course.status === 'published'}
            tone="course"
            icon={BookOpen}
            onEdit={() => setModal(course)}
            onDelete={() => setDeleting(course)}
          />
        ))}
      </CardGrid>
      {courses.length === 0 ? <p className="neuro-text-muted">ضيف كورس عشان تبدأ.</p> : null}

      <Modal
        open={Boolean(modal)}
        title={editing ? 'تعديل الكورس' : 'إضافة كورس'}
        onClose={() => setModal(null)}
      >
        <div className="space-y-4">
          <Input label="اسم الكورس" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <label className="block space-y-2">
            <span className="neuro-text text-sm font-semibold">الصف</span>
            <select className="neuro-input w-full rounded-2xl px-4 py-3" value={grade} onChange={(event) => setGrade(event.target.value)}>
              {grades.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <Input label="الوصف" value={description} onChange={(event) => setDescription(event.target.value)} />
          <label className="block space-y-2 text-sm font-semibold">
            صورة الكورس
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                const result = await uploadCover(file)
                if ('data' in result && result.data) setImageUrl(result.data)
              }}
            />
          </label>
          {imageUrl ? <img src={imageUrl} alt="" className="h-36 w-full rounded-2xl object-cover" /> : null}
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} />
            ظاهر للطلاب
          </label>
          <Button
            disabled={isLoading || !title}
            onClick={() => {
              void save({
                ...(editing ?? {}),
                title,
                description,
                grade,
                image_url: imageUrl || null,
                educational_stage: 'secondary',
                status: published ? 'published' : 'draft',
              }).then(() => setModal(null))
            }}
          >
            حفظ
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="حذف الكورس؟"
        text={`هيتنقل "${deleting?.title}" والترمات والشهور والدروس معاه. مفيش رجوع.`}
        confirmLabel="حذف"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          void deleteCourse(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}
