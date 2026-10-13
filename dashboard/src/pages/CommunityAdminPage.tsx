/* صفحة المجتمع متوقفة مؤقتًا.
import { Button } from '@/components/ui/Button'
import { useGetPostsQuery, useHidePostMutation } from '@/store/api/adminApi'

export function CommunityAdminPage() {
  const { data = [], refetch } = useGetPostsQuery()
  const [hide] = useHidePostMutation()

  return (
    <div className="space-y-3">
      {data.map((post) => (
        <article key={post.id} className="neuro-raised-sm rounded-3xl p-5">
          <h3 className="neuro-text font-bold">{post.title}</h3>
          <p className="neuro-text-muted mt-2">{post.body}</p>
          <Button
            variant="ghost"
            className="mt-3"
            onClick={() => void hide(post.id).then(() => refetch())}
          >
            إخفاء
          </Button>
        </article>
      ))}
    </div>
  )
}
*/
export {}
