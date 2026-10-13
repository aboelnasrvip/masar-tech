import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PlayCircle } from 'lucide-react'
import { CardGrid, ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EntityCard, PageHeader } from '@/components/ui/EntityCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import {
  useDeleteLessonMutation,
  useDeleteModuleMutation,
  useGetCourseBundleQuery,
  useGetModuleLessonsQuery,
  useSaveLessonMutation,
  useSaveModuleMutation,
} from '@/store/api/adminApi'
import type { Course, CourseModule, CourseTerm, Lesson } from '@/types/models'

export function MonthEditorPage() {
  const { courseId = '', termId = '', monthId = '' } = useParams()
  const { data, isLoading, isError } = useGetCourseBundleQuery(courseId, { skip: !courseId })
  const month = data?.modules.find((item) => item.id === monthId)
  const term = data?.terms.find((item) => item.id === termId)
  if (isLoading) return <p className="neuro-text-muted">جاري التحميل...</p>
  if (isError || !data) {
    return (
      <div className="neuro-raised-sm space-y-3 rounded-3xl p-5">
        <p className="neuro-text text-lg font-bold">الكورس مش موجود</p>
        <Link to="/courses" className="neuro-accent font-semibold">
          رجوع للكورسات
        </Link>
      </div>
    )
  }
  if (!month) return <p className="neuro-text-muted">الشهر مش موجود.</p>
  return <MonthEditorInner courseId={courseId} termId={termId} course={data.course} term={term} month={month} />
}

function MonthEditorInner({
  courseId,
  termId,
  course,
  term,
  month,
}: {
  courseId: string
  termId: string
  course: Course
  term?: CourseTerm
  month: CourseModule
}) {
  const navigate = useNavigate()
  const { data: lessons = [] } = useGetModuleLessonsQuery(month.id)
  const [saveModule] = useSaveModuleMutation()
  const [saveLesson] = useSaveLessonMutation()
  const [deleteModule] = useDeleteModuleMutation()
  const [deleteLesson] = useDeleteLessonMutation()
  const [monthOpen, setMonthOpen] = useState(false)
  const [lessonModal, setLessonModal] = useState<Lesson | 'new' | null>(null)
  const [deleting, setDeleting] = useState<{ type: 'month' | 'lesson'; id: string; title: string } | null>(null)
  const [title, setTitle] = useState(month.title)
  const [price, setPrice] = useState(String(month.price ?? 0))
  const [description, setDescription] = useState(month.description ?? '')
  const [published, setPublished] = useState(month.is_published)
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonPublished, setLessonPublished] = useState(false)

  useEffect(() => {
    if (!monthOpen) return
    setTitle(month.title)
    setPrice(String(month.price ?? 0))
    setDescription(month.description ?? '')
    setPublished(month.is_published)
  }, [month, monthOpen])

  useEffect(() => {
    if (!lessonModal) return
    if (lessonModal === 'new') {
      setLessonTitle('')
      setLessonPublished(false)
      return
    }
    setLessonTitle(lessonModal.title)
    setLessonPublished(lessonModal.is_published)
  }, [lessonModal])

  const editingLesson = lessonModal && lessonModal !== 'new' ? lessonModal : null

  return (
    <div className="space-y-5">
      <PageHeader
        crumbs={[
          { to: '/courses', label: 'الكورسات' },
          { to: `/courses/${courseId}`, label: course.title },
          { to: `/courses/${courseId}/terms/${termId}`, label: term?.title ?? 'ترم' },
        ]}
        title={month.title}
        visible={month.is_published}
        onEdit={() => setMonthOpen(true)}
        onAdd={() => setLessonModal('new')}
        addLabel="إضافة درس"
      />

      <CardGrid>
        {lessons.map((lesson, index) => (
          <EntityCard
            key={lesson.id}
            to={`/lessons/${lesson.id}`}
            title={`درس ${index + 1}: ${lesson.title}`}
            visible={lesson.is_published}
            tone="lesson"
            icon={PlayCircle}
            onEdit={() => setLessonModal(lesson)}
            onDelete={() => setDeleting({ type: 'lesson', id: lesson.id, title: lesson.title })}
          />
        ))}
      </CardGrid>
      {lessons.length === 0 ? <p className="neuro-text-muted">ضيف دروس للشهر.</p> : null}

      <Modal open={monthOpen} title="تعديل الشهر" onClose={() => setMonthOpen(false)}>
        <div className="space-y-4">
          <Input label="اسم الشهر" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Input label="سعر الشهر" value={price} onChange={(event) => setPrice(event.target.value)} />
          <Input label="الوصف" value={description} onChange={(event) => setDescription(event.target.value)} />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} />
            ظاهر للطلاب
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                void saveModule({
                  id: month.id,
                  course_id: courseId,
                  term_id: month.term_id,
                  title,
                  description,
                  price: Number(price),
                  order_index: month.order_index,
                  is_published: published,
                }).then(() => setMonthOpen(false))
              }}
            >
              حفظ
            </Button>
            <Button variant="ghost" onClick={() => setDeleting({ type: 'month', id: month.id, title: month.title })}>
              حذف الشهر
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(lessonModal)} title={editingLesson ? 'تعديل الدرس' : 'إضافة درس'} onClose={() => setLessonModal(null)}>
        <div className="space-y-4">
          <Input label="اسم الدرس" value={lessonTitle} onChange={(event) => setLessonTitle(event.target.value)} />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={lessonPublished} onChange={(event) => setLessonPublished(event.target.checked)} />
            ظاهر للطلاب
          </label>
          <Button
            disabled={!lessonTitle}
            onClick={() => {
              void saveLesson({
                ...(editingLesson ?? {}),
                id: editingLesson?.id,
                module_id: month.id,
                title: lessonTitle,
                order_index: editingLesson?.order_index ?? lessons.length,
                is_published: lessonPublished,
              }).then(() => setLessonModal(null))
            }}
          >
            حفظ
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={deleting?.type === 'month' ? 'حذف الشهر؟' : 'حذف الدرس؟'}
        text={deleting?.type === 'month' ? 'الدروس جواه هتتمسح.' : `هيتنقل "${deleting?.title}".`}
        confirmLabel="حذف"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          if (deleting.type === 'month') {
            void deleteModule(deleting.id).then(() => navigate(`/courses/${courseId}/terms/${termId}`))
          } else {
            void deleteLesson(deleting.id)
          }
          setDeleting(null)
        }}
      />
    </div>
  )
}
