import { firstRelation } from '@/lib/labels'
import { useGetProgressQuery } from '@/store/api/studentApi'

export function ProgressPage() {
  const { data = [] } = useGetProgressQuery()
  const done = data.filter((item) => item.lesson_completed).length

  return (
    <div className="neuro-raised rounded-[2rem] p-6">
      <h1 className="neuro-text text-3xl font-extrabold">التقدم</h1>
      <p className="mt-3 text-2xl neuro-accent">{done} درس مكتمل</p>
      <div className="mt-5 space-y-2">
        {data.map((item) => (
          <div key={item.lesson_id} className="neuro-pressed rounded-2xl px-4 py-3">
            {item.lesson_completed ? 'مكتمل' : 'جاري'} — {firstRelation(item.lessons)?.title ?? 'درس'}
          </div>
        ))}
        {data.length === 0 ? <p className="neuro-text-muted">لسه ما بدأتش أي درس.</p> : null}
      </div>
    </div>
  )
}
