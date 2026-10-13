import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Layers } from 'lucide-react'
import { CardGrid, ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EntityCard, PageHeader } from '@/components/ui/EntityCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import {
  useDeleteCourseMutation,
  useDeleteTermMutation,
  useGetCourseBundleQuery,
  useSaveCourseMutation,
  useSaveTermMutation,
  useUploadCoverMutation,
} from '@/store/api/adminApi'
import type { Course, CourseModule, CourseTerm } from '@/types/models'

export function CourseEditorPage() {
  const { courseId = '' } = useParams()
  const { data, isLoading, isError } = useGetCourseBundleQuery(courseId, { skip: !courseId })
  if (isLoading) return <p className="neuro-text-muted">جاري التحميل...</p>
  if (isError || !data) {
    return (
      <div className="neuro-raised-sm space-y-3 rounded-3xl p-5">
        <p className="neuro-text text-lg font-bold">الكورس مش موجود</p>
        <p className="neuro-text-muted text-sm">ممكن يكون اتمسح، أو الحساب الحالي مش شايفه.</p>
        <Link to="/courses" className="neuro-accent font-semibold">
          رجوع للكورسات
        </Link>
      </div>
    )
  }
  return <CourseEditorInner courseId={courseId} data={data} />
}

function CourseEditorInner({
  courseId,
  data,
}: {
  courseId: string
  data: { course: Course; terms: CourseTerm[]; modules: CourseModule[] }
}) {
  const navigate = useNavigate()
  const { course } = data
  const [saveCourse] = useSaveCourseMutation()
  const [saveTerm] = useSaveTermMutation()
  const [deleteCourse] = useDeleteCourseMutation()
  const [deleteTerm] = useDeleteTermMutation()
  const [uploadCover] = useUploadCoverMutation()
  const [courseOpen, setCourseOpen] = useState(false)
  const [termModal, setTermModal] = useState<CourseTerm | 'new' | null>(null)
  const [deleting, setDeleting] = useState<{ type: 'course' | 'term'; id: string; title: string } | null>(null)
  const [courseTitle, setCourseTitle] = useState(course.title)
  const [courseDescription, setCourseDescription] = useState(course.description ?? '')
  const [courseImage, setCourseImage] = useState(course.image_url ?? '')
  const [coursePublished, setCoursePublished] = useState(course.status === 'published')
  const [termTitle, setTermTitle] = useState('')
  const [termPrice, setTermPrice] = useState('400')
  const [termDescription, setTermDescription] = useState('')
  const [termImage, setTermImage] = useState('')
  const [termPublished, setTermPublished] = useState(true)

  useEffect(() => {
    if (!courseOpen) return
    setCourseTitle(course.title)
    setCourseDescription(course.description ?? '')
    setCourseImage(course.image_url ?? '')
    setCoursePublished(course.status === 'published')
  }, [course, courseOpen])

  useEffect(() => {
    if (!termModal) return
    if (termModal === 'new') {
      setTermTitle('الترم الأول')
      setTermPrice('400')
      setTermDescription('')
      setTermImage('')
      setTermPublished(true)
      return
    }
    setTermTitle(termModal.title)
    setTermPrice(String(termModal.price))
    setTermDescription(termModal.description ?? '')
    setTermImage(termModal.image_url ?? '')
    setTermPublished(termModal.is_published)
  }, [termModal])

  const editingTerm = termModal && termModal !== 'new' ? termModal : null

  return (
    <div className="space-y-5">
      <PageHeader
        crumbs={[{ to: '/courses', label: 'الكورسات' }]}
        title={course.title}
        visible={course.status === 'published'}
        onEdit={() => setCourseOpen(true)}
        onAdd={() => setTermModal('new')}
        addLabel="إضافة ترم"
      />

      <CardGrid>
        {data.terms.map((term) => {
          const months = data.modules.filter((item) => item.term_id === term.id).length
          return (
            <EntityCard
              key={term.id}
              to={`/courses/${courseId}/terms/${term.id}`}
              title={term.title}
              subtitle={`${months} شهور`}
              description={term.description}
              imageUrl={term.image_url}
              visible={term.is_published}
              tone="term"
              icon={Layers}
              meta={`${term.price} ج`}
              onEdit={() => setTermModal(term)}
              onDelete={() => setDeleting({ type: 'term', id: term.id, title: term.title })}
            />
          )
        })}
      </CardGrid>
      {data.terms.length === 0 ? <p className="neuro-text-muted">ضيف ترم عشان تبدأ المسار.</p> : null}

      <Modal open={courseOpen} title="تعديل الكورس" onClose={() => setCourseOpen(false)}>
        <div className="space-y-4">
          <Input label="اسم الكورس" value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} />
          <Input label="الوصف" value={courseDescription} onChange={(event) => setCourseDescription(event.target.value)} />
          <label className="block space-y-2 text-sm font-semibold">
            صورة الكورس
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                const result = await uploadCover(file)
                if ('data' in result && result.data) setCourseImage(result.data)
              }}
            />
          </label>
          {courseImage ? <img src={courseImage} alt="" className="h-36 w-full rounded-2xl object-cover" /> : null}
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={coursePublished} onChange={(event) => setCoursePublished(event.target.checked)} />
            ظاهر للطلاب
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                void saveCourse({
                  ...course,
                  title: courseTitle,
                  description: courseDescription,
                  image_url: courseImage || null,
                  status: coursePublished ? 'published' : 'draft',
                }).then(() => setCourseOpen(false))
              }}
            >
              حفظ
            </Button>
            <Button variant="ghost" onClick={() => setDeleting({ type: 'course', id: courseId, title: course.title })}>
              حذف الكورس
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(termModal)} title={editingTerm ? 'تعديل الترم' : 'إضافة ترم'} onClose={() => setTermModal(null)}>
        <div className="space-y-4">
          <Input label="اسم الترم" value={termTitle} onChange={(event) => setTermTitle(event.target.value)} />
          <Input label="سعر الترم الكامل" value={termPrice} onChange={(event) => setTermPrice(event.target.value)} />
          <Input label="وصف الترم" value={termDescription} onChange={(event) => setTermDescription(event.target.value)} />
          <label className="block space-y-2 text-sm font-semibold">
            صورة الترم
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                const result = await uploadCover(file)
                if ('data' in result && result.data) setTermImage(result.data)
              }}
            />
          </label>
          {termImage ? <img src={termImage} alt="" className="h-36 w-full rounded-2xl object-cover" /> : null}
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={termPublished} onChange={(event) => setTermPublished(event.target.checked)} />
            ظاهر للطلاب
          </label>
          <Button
            disabled={!termTitle}
            onClick={() => {
              void saveTerm({
                id: editingTerm?.id,
                course_id: courseId,
                title: termTitle,
                description: termDescription,
                price: Number(termPrice),
                image_url: termImage || null,
                order_index: editingTerm?.order_index ?? data.terms.length,
                is_published: termPublished,
              }).then(() => setTermModal(null))
            }}
          >
            حفظ
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={deleting?.type === 'course' ? 'حذف الكورس؟' : 'حذف الترم؟'}
        text={deleting?.type === 'course' ? 'هيتنقل الترم والشهور والدروس معاه. مفيش رجوع.' : `الشهور والدروس جوه "${deleting?.title}" هتتمسح.`}
        confirmLabel="حذف"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          if (deleting.type === 'course') {
            void deleteCourse(deleting.id).then(() => navigate('/courses'))
          } else {
            void deleteTerm(deleting.id)
          }
          setDeleting(null)
        }}
      />
    </div>
  )
}
