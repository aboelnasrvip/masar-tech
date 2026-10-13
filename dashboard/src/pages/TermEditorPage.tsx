import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { CardGrid, ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EntityCard, PageHeader } from '@/components/ui/EntityCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import {
  useDeleteModuleMutation,
  useDeleteTermMutation,
  useGetCourseBundleQuery,
  useSaveModuleMutation,
  useSaveTermMutation,
  useUploadCoverMutation,
} from '@/store/api/adminApi'

export function TermEditorPage() {
  const { courseId = '', termId = '' } = useParams()
  const { data, isLoading, isError } = useGetCourseBundleQuery(courseId, { skip: !courseId })
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
  if (!term) return <p className="neuro-text-muted">الترم مش موجود.</p>
  return (
    <TermEditorInner
      courseId={courseId}
      courseTitle={data.course.title}
      term={term}
      months={data.modules.filter((item) => item.term_id === termId)}
    />
  )
}

function TermEditorInner({
  courseId,
  courseTitle,
  term,
  months,
}: {
  courseId: string
  courseTitle: string
  term: { id: string; title: string; description: string | null; image_url: string | null; price: number; is_published: boolean; order_index: number }
  months: Array<{ id: string; title: string; description: string | null; price?: number; is_published: boolean; order_index?: number }>
}) {
  const navigate = useNavigate()
  const [saveTerm] = useSaveTermMutation()
  const [saveModule] = useSaveModuleMutation()
  const [deleteTerm] = useDeleteTermMutation()
  const [deleteModule] = useDeleteModuleMutation()
  const [uploadCover] = useUploadCoverMutation()
  const [termOpen, setTermOpen] = useState(false)
  const [monthModal, setMonthModal] = useState<(typeof months)[number] | 'new' | null>(null)
  const [deleting, setDeleting] = useState<{ type: 'term' | 'month'; id: string; title: string } | null>(null)
  const [title, setTitle] = useState(term.title)
  const [price, setPrice] = useState(String(term.price))
  const [description, setDescription] = useState(term.description ?? '')
  const [imageUrl, setImageUrl] = useState(term.image_url ?? '')
  const [published, setPublished] = useState(term.is_published)
  const [monthTitle, setMonthTitle] = useState('')
  const [monthPrice, setMonthPrice] = useState('150')
  const [monthDescription, setMonthDescription] = useState('')
  const [monthPublished, setMonthPublished] = useState(true)

  useEffect(() => {
    if (!termOpen) return
    setTitle(term.title)
    setPrice(String(term.price))
    setDescription(term.description ?? '')
    setImageUrl(term.image_url ?? '')
    setPublished(term.is_published)
  }, [term, termOpen])

  useEffect(() => {
    if (!monthModal) return
    if (monthModal === 'new') {
      setMonthTitle('')
      setMonthPrice('150')
      setMonthDescription('')
      setMonthPublished(true)
      return
    }
    setMonthTitle(monthModal.title)
    setMonthPrice(String(monthModal.price ?? 0))
    setMonthDescription(monthModal.description ?? '')
    setMonthPublished(monthModal.is_published)
  }, [monthModal])

  const editingMonth = monthModal && monthModal !== 'new' ? monthModal : null

  return (
    <div className="space-y-5">
      <PageHeader
        crumbs={[
          { to: '/courses', label: 'الكورسات' },
          { to: `/courses/${courseId}`, label: courseTitle },
        ]}
        title={term.title}
        visible={term.is_published}
        onEdit={() => setTermOpen(true)}
        onAdd={() => setMonthModal('new')}
        addLabel="إضافة شهر"
      />

      <CardGrid>
        {months.map((month) => (
          <EntityCard
            key={month.id}
            to={`/courses/${courseId}/terms/${term.id}/months/${month.id}`}
            title={month.title}
            description={month.description}
            visible={month.is_published}
            tone="month"
            icon={CalendarDays}
            meta={`${month.price ?? 0} ج`}
            onEdit={() => setMonthModal(month)}
            onDelete={() => setDeleting({ type: 'month', id: month.id, title: month.title })}
          />
        ))}
      </CardGrid>
      {months.length === 0 ? <p className="neuro-text-muted">ضيف شهور للترم.</p> : null}

      <Modal open={termOpen} title="تعديل الترم" onClose={() => setTermOpen(false)}>
        <div className="space-y-4">
          <Input label="اسم الترم" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Input label="سعر الترم" value={price} onChange={(event) => setPrice(event.target.value)} />
          <Input label="الوصف" value={description} onChange={(event) => setDescription(event.target.value)} />
          <label className="block space-y-2 text-sm font-semibold">
            صورة الترم
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
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                void saveTerm({
                  id: term.id,
                  course_id: courseId,
                  title,
                  description,
                  image_url: imageUrl || null,
                  price: Number(price),
                  order_index: term.order_index,
                  is_published: published,
                }).then(() => setTermOpen(false))
              }}
            >
              حفظ
            </Button>
            <Button variant="ghost" onClick={() => setDeleting({ type: 'term', id: term.id, title: term.title })}>
              حذف الترم
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(monthModal)} title={editingMonth ? 'تعديل الشهر' : 'إضافة شهر'} onClose={() => setMonthModal(null)}>
        <div className="space-y-4">
          <Input label="اسم الشهر" value={monthTitle} onChange={(event) => setMonthTitle(event.target.value)} />
          <Input label="سعر الشهر" value={monthPrice} onChange={(event) => setMonthPrice(event.target.value)} />
          <Input label="وصف الشهر" value={monthDescription} onChange={(event) => setMonthDescription(event.target.value)} />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={monthPublished} onChange={(event) => setMonthPublished(event.target.checked)} />
            ظاهر للطلاب
          </label>
          <Button
            disabled={!monthTitle}
            onClick={() => {
              void saveModule({
                id: editingMonth?.id,
                course_id: courseId,
                term_id: term.id,
                title: monthTitle,
                description: monthDescription,
                price: Number(monthPrice),
                order_index: editingMonth?.order_index ?? months.length,
                is_published: monthPublished,
              }).then(() => setMonthModal(null))
            }}
          >
            حفظ
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={deleting?.type === 'term' ? 'حذف الترم؟' : 'حذف الشهر؟'}
        text={deleting?.type === 'term' ? 'الشهور والدروس جواه هتتمسح.' : `الدروس جوه "${deleting?.title}" هتتمسح.`}
        confirmLabel="حذف"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          if (deleting.type === 'term') {
            void deleteTerm(deleting.id).then(() => navigate(`/courses/${courseId}`))
          } else {
            void deleteModule(deleting.id)
          }
          setDeleting(null)
        }}
      />
    </div>
  )
}
