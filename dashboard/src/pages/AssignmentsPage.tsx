import { useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { firstRelation } from '@/lib/labels'
import { useGetAssignmentAttemptsQuery } from '@/store/api/adminApi'

export function AssignmentsPage() {
  const { data = [], isLoading } = useGetAssignmentAttemptsQuery()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => data.find((item) => item.id === selectedId) ?? null, [data, selectedId])
  const selectedProfile = selected ? firstRelation(selected.profiles) : null
  const selectedAssignment = selected ? firstRelation(selected.assignments) : null
  const selectedLesson = selectedAssignment && 'lessons' in selectedAssignment
    ? firstRelation((selectedAssignment as { lessons?: { title: string } | { title: string }[] }).lessons)
    : null

  return (
    <div className="space-y-4">
      <p className="neuro-text-muted text-sm">كل تسليمات الطلاب: الاسم، الدرجة، والصح والغلط.</p>
      {isLoading ? <p className="neuro-text-muted">جاري التحميل...</p> : null}
      <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.map((item) => {
          const profile = firstRelation(item.profiles)
          const assignment = firstRelation(item.assignments)
          const lesson =
            assignment && 'lessons' in assignment
              ? firstRelation((assignment as { lessons?: { title: string } | { title: string }[] }).lessons)
              : null
          return (
            <button
              key={item.id}
              type="button"
              className="neuro-raised-sm neuro-hover flex h-full flex-col rounded-3xl p-5 text-right"
              onClick={() => setSelectedId(item.id)}
            >
              <p className="text-sm neuro-accent">{item.passed ? 'ناجح' : 'اتسلم'} — {item.percentage}%</p>
              <h3 className="neuro-text mt-1 text-lg font-bold">{profile?.full_name ?? 'طالب'}</h3>
              <p className="neuro-text-muted mt-2 flex-1 text-sm">{lesson?.title ?? assignment?.title ?? 'واجب'}</p>
              <p className="mt-3 font-bold neuro-accent">
                {item.score} / {item.total_points}
              </p>
            </button>
          )
        })}
      </div>
      {!isLoading && data.length === 0 ? <p className="neuro-text-muted">لسه مفيش تسليمات.</p> : null}

      <Modal open={Boolean(selected)} title="تفاصيل الواجب" onClose={() => setSelectedId(null)}>
        {selected ? (
          <div className="space-y-3">
            <p><strong>الطالب:</strong> {selectedProfile?.full_name} — {selectedProfile?.phone}</p>
            <p><strong>الدرس:</strong> {selectedLesson?.title ?? '—'}</p>
            <p><strong>الواجب:</strong> {selectedAssignment?.title}</p>
            <p><strong>المحاولة:</strong> {selected.attempt_number}</p>
            <p><strong>النتيجة:</strong> {selected.score} / {selected.total_points} ({selected.percentage}%)</p>
            <div className="space-y-2">
              {(selected.assignment_answers ?? []).map((answer, index) => {
                const question = firstRelation(answer.questions)
                return (
                  <div key={`${selected.id}-${index}`} className={`rounded-2xl p-3 ${answer.is_correct ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <p className="font-semibold">{question?.question_text}</p>
                    <p className="mt-1 text-sm">{answer.is_correct ? 'صح' : 'غلط'}{answer.answer_text ? ` — ${answer.answer_text}` : ''}</p>
                    {question?.explanation ? <p className="neuro-text-muted mt-1 text-sm">{question.explanation}</p> : null}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
