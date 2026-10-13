/* صفحة المجتمع متوقفة مؤقتًا.
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAppSelector } from '@/store/hooks'
import { useAddPostMutation, useAddReplyMutation, useGetPostsQuery, useGetRepliesQuery } from '@/store/api/studentApi'

export function CommunityPage() {
  const user = useAppSelector((state) => state.auth.user)
  const { data: posts = [], refetch } = useGetPostsQuery()
  const [addPost] = useAddPostMutation()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      <form
        className="neuro-raised space-y-3 rounded-[2rem] p-5"
        onSubmit={(event) => {
          event.preventDefault()
          if (!user) return
          void addPost({ author_id: user.id, title, body }).then(() => {
            setTitle('')
            setBody('')
            void refetch()
          })
        }}
      >
        <Input label="عنوان السؤال" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <textarea className="neuro-input min-h-24 w-full rounded-2xl p-3" value={body} onChange={(event) => setBody(event.target.value)} required />
        <Button type="submit">نشر</Button>
      </form>
      {posts.length === 0 ? <p className="neuro-text-muted">لسه مفيش أسئلة. ابدأ النقاش.</p> : null}
      {posts.map((post) => (
        <article key={post.id} className="neuro-raised-sm rounded-3xl p-5">
          <h3 className="neuro-text text-xl font-bold">{post.title}</h3>
          <p className="neuro-text-muted mt-2">{post.body}</p>
          <button type="button" className="mt-3 text-sm neuro-accent" onClick={() => setOpen(open === post.id ? null : post.id)}>
            الردود
          </button>
          {open === post.id ? <Replies postId={post.id} /> : null}
        </article>
      ))}
    </div>
  )
}

function Replies({ postId }: { postId: string }) {
  const user = useAppSelector((state) => state.auth.user)
  const { data = [], refetch } = useGetRepliesQuery(postId)
  const [addReply] = useAddReplyMutation()
  const [body, setBody] = useState('')

  return (
    <div className="mt-4 space-y-3">
      {data.map((reply) => (
        <p key={reply.id} className="neuro-pressed rounded-2xl p-3">
          {reply.body}
        </p>
      ))}
      <textarea className="neuro-input min-h-20 w-full rounded-2xl p-3" value={body} onChange={(event) => setBody(event.target.value)} />
      <Button
        onClick={() => {
          if (!user) return
          void addReply({ post_id: postId, author_id: user.id, body }).then(() => {
            setBody('')
            void refetch()
          })
        }}
      >
        رد
      </Button>
    </div>
  )
}
*/
export {}
