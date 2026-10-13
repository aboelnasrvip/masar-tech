import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LessonChat } from '@/components/chat/LessonChat'
import { firstRelation } from '@/lib/labels'
import { useAppSelector } from '@/store/hooks'
import {
  useAddLessonChatMutation,
  useDeleteLessonChatMutation,
  useGetLessonChatsQuery,
  useUpdateLessonChatMutation,
} from '@/store/api/adminApi'

export function MessagesPage() {
  const user = useAppSelector((state) => state.auth.user)
  const { data = [] } = useGetLessonChatsQuery(undefined, { pollingInterval: 8000 })
  const [addChat] = useAddLessonChatMutation()
  const [updateChat] = useUpdateLessonChatMutation()
  const [deleteChat] = useDeleteLessonChatMutation()
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, { lessonId: string; title: string; items: typeof data }>()
    for (const item of data) {
      const title = firstRelation(item.lessons)?.title ?? 'درس'
      const current = map.get(item.lesson_id) ?? { lessonId: item.lesson_id, title, items: [] }
      current.items.push(item)
      map.set(item.lesson_id, current)
    }
    return [...map.values()].sort((a, b) => {
      const aTime = a.items.at(-1)?.created_at ?? ''
      const bTime = b.items.at(-1)?.created_at ?? ''
      return bTime.localeCompare(aTime)
    })
  }, [data])

  const thread = groups.find((item) => item.lessonId === selectedLesson) ?? groups[0]

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="neuro-raised-sm space-y-2 rounded-3xl p-4">
        <h2 className="neuro-text mb-3 font-bold">أسئلة الدروس</h2>
        {groups.map((group) => {
          const last = group.items.at(-1)
          const lastProfile = firstRelation(last?.profiles)
          return (
            <button
              key={group.lessonId}
              type="button"
              className={`w-full rounded-2xl px-4 py-3 text-right ${
                thread?.lessonId === group.lessonId ? 'neuro-active' : 'neuro-pressed'
              }`}
              onClick={() => setSelectedLesson(group.lessonId)}
            >
              <p className="font-semibold">{group.title}</p>
              <p className="mt-1 truncate text-sm opacity-80">
                {lastProfile?.full_name ? `${lastProfile.full_name}: ` : ''}
                {last?.body ?? `${group.items.length} رسالة`}
              </p>
            </button>
          )
        })}
        {groups.length === 0 ? <p className="neuro-text-muted text-sm">مفيش أسئلة لسه.</p> : null}
      </aside>
      {thread ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <h3 className="neuro-text text-xl font-extrabold">{thread.title}</h3>
            <Link to={`/lessons/${thread.lessonId}`} className="text-sm neuro-accent">
              صفحة الدرس
            </Link>
          </div>
          <LessonChat
            messages={thread.items}
            currentUserId={user?.id}
            canModerate
            placeholder="اكتب ردك، واسمك هيظهر للطالب..."
            onSend={async (body) => {
              if (!user) return
              await addChat({ lesson_id: thread.lessonId, author_id: user.id, body })
            }}
            onEdit={async (id, body) => {
              await updateChat({ id, body })
            }}
            onDelete={async (id) => {
              await deleteChat(id)
            }}
          />
        </div>
      ) : (
        <section className="neuro-raised rounded-3xl p-5">
          <p className="neuro-text-muted">اختار درس من القائمة عشان تشوف الشات.</p>
        </section>
      )}
    </div>
  )
}
