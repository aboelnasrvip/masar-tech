import { useEffect, useRef, useState } from 'react'
import { Pencil, Send, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cx } from '@/lib/cx'

export type LessonChatMessage = {
  id: string
  body: string
  created_at: string
  author_id: string
  updated_at?: string | null
  profiles?: { full_name: string; role?: string } | { full_name: string; role?: string }[]
}

function profileOf(item: LessonChatMessage) {
  return Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
}

function isStaffRole(role?: string) {
  return role === 'admin' || role === 'teacher'
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  })
}

export function LessonChat({
  messages,
  currentUserId,
  canModerate = false,
  placeholder = 'اكتب سؤالك للمدرس...',
  sendLabel = 'إرسال',
  onSend,
  onEdit,
  onDelete,
}: {
  messages: LessonChatMessage[]
  currentUserId?: string
  canModerate?: boolean
  placeholder?: string
  sendLabel?: string
  onSend: (body: string) => Promise<unknown> | unknown
  onEdit: (id: string, body: string) => Promise<unknown> | unknown
  onDelete: (id: string) => Promise<unknown> | unknown
}) {
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = scroller.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages.length])

  async function send() {
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      await onSend(body)
      setDraft('')
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit() {
    if (!editingId || !editBody.trim() || busy) return
    setBusy(true)
    try {
      await onEdit(editingId, editBody.trim())
      setEditingId(null)
      setEditBody('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="neuro-raised-sm flex min-h-[420px] flex-col overflow-hidden rounded-[1.75rem]">
      <header className="border-b border-[color-mix(in_srgb,var(--neuro-text-muted)_22%,transparent)] px-5 py-4">
        <h2 className="neuro-text font-extrabold">أسئلة الدرس</h2>
        <p className="neuro-text-muted mt-1 text-sm">اسأل هنا، والرد هيظهر باسم المدرس في نفس الشات.</p>
      </header>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="neuro-text-muted py-10 text-center text-sm">مفيش أسئلة على الدرس ده لسه. ابدأ المحادثة.</p>
        ) : null}
        {messages.map((item) => {
          const profile = profileOf(item)
          const own = item.author_id === currentUserId
          const staff = isStaffRole(profile?.role)
          const name = staff ? profile?.full_name || 'المدرس' : profile?.full_name || 'طالب'
          const canEdit = own
          const canDelete = own || canModerate
          return (
            <article
              key={item.id}
              className={cx('flex max-w-[92%] flex-col gap-1 sm:max-w-[78%]', own ? 'ms-auto items-end' : 'me-auto items-start')}
            >
              <div className="flex items-center gap-2 px-1">
                <span className={cx('text-xs font-extrabold', staff ? 'neuro-accent' : 'neuro-text')}>{name}</span>
                {staff ? <span className="neuro-accent-soft rounded-full px-2 py-0.5 text-[10px] font-bold">المدرس</span> : null}
              </div>
              <div
                className={cx(
                  'w-full rounded-[1.35rem] px-4 py-3 leading-7',
                  own && 'neuro-brand',
                  !own && staff && 'neuro-accent-soft',
                  !own && !staff && 'neuro-pressed',
                )}
              >
                {editingId === item.id ? (
                  <div className="space-y-2">
                    <textarea
                      className="neuro-input min-h-20 w-full rounded-2xl p-3 text-sm"
                      value={editBody}
                      onChange={(event) => setEditBody(event.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button className="px-3 py-1.5 text-xs" disabled={busy} onClick={() => void saveEdit()}>
                        حفظ
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-3 py-1.5 text-xs"
                        onClick={() => {
                          setEditingId(null)
                          setEditBody('')
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{item.body}</p>
                )}
              </div>
              <div className="flex items-center gap-2 px-1">
                <span className="neuro-text-muted text-[11px]">
                  {formatTime(item.created_at)}
                  {item.updated_at ? ' · تم التعديل' : ''}
                </span>
                {editingId !== item.id && canEdit ? (
                  <button
                    type="button"
                    className="neuro-text-muted rounded-lg p-1 hover:text-(--neuro-text)"
                    aria-label="تعديل الرسالة"
                    onClick={() => {
                      setEditingId(item.id)
                      setEditBody(item.body)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                {editingId !== item.id && canDelete ? (
                  <button
                    type="button"
                    className="neuro-text-muted rounded-lg p-1 hover:text-(--neuro-danger)"
                    aria-label="مسح الرسالة"
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      <div className="border-t border-[color-mix(in_srgb,var(--neuro-text-muted)_22%,transparent)] p-3">
        <div className="neuro-pressed flex items-end gap-2 rounded-[1.4rem] p-2">
          <textarea
            className="neuro-text max-h-32 min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none"
            placeholder={placeholder}
            value={draft}
            rows={1}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void send()
              }
            }}
          />
          <Button className="h-11 w-11 shrink-0 rounded-2xl px-0" disabled={busy || !draft.trim()} onClick={() => void send()} aria-label={sendLabel}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="مسح الرسالة؟"
        text="هتتمسح من الشات ومش هترجع."
        confirmLabel="مسح"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return
          const id = deleteId
          setDeleteId(null)
          void onDelete(id)
        }}
      />
    </section>
  )
}
