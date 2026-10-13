import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconButton } from '@/components/ui/EntityCard'
import { Input } from '@/components/ui/Input'
import { createPaymentMethod, defaultPaymentMethods } from '@/data/wallets'
import { watermarkPositionLabel } from '@/lib/labels'
import { useGetSettingsQuery, useSaveSettingsMutation, useGetWatermarkSettingsQuery, useSaveWatermarkSettingsMutation, useYoutubeStartMutation } from '@/store/api/adminApi'
import type { PaymentMethod, WatermarkPosition } from '@/types/models'

export function SettingsPage() {
  const { data } = useGetSettingsQuery()
  const { data: watermark } = useGetWatermarkSettingsQuery()
  const [save, saveState] = useSaveSettingsMutation()
  const [saveWatermark] = useSaveWatermarkSettingsMutation()
  const [startYoutube] = useYoutubeStartMutation()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [newName, setNewName] = useState('')
  const [newAccount, setNewAccount] = useState('')
  const [deleting, setDeleting] = useState<PaymentMethod | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [watermarkEnabled, setWatermarkEnabled] = useState(true)
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>('moving')
  const [params] = useSearchParams()
  const quickAdd = useMemo(
    () => defaultPaymentMethods.filter((item) => !methods.some((method) => method.id === item.id || method.name === item.name)),
    [methods],
  )

  useEffect(() => {
    if (data) setMethods(data)
  }, [data])

  useEffect(() => {
    if (!watermark) return
    setWatermarkEnabled(watermark.enabled)
    setWatermarkPosition(watermark.position)
  }, [watermark])

  function updateMethod(index: number, patch: Partial<PaymentMethod>) {
    setMethods((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))
    setMessage('')
    setError('')
  }

  function moveMethod(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= methods.length) return
    const next = [...methods]
    const [item] = next.splice(index, 1)
    next.splice(nextIndex, 0, item)
    void persist(next)
  }

  async function persist(next: PaymentMethod[]) {
    setMethods(next)
    setError('')
    setMessage('')
    const result = await save(next)
    if ('error' in result) {
      setError('حصل خطأ أثناء حفظ طرق الدفع.')
      return false
    }
    setMessage('اتحفظت طرق الدفع.')
    return true
  }

  async function addMethod(name: string, account = '') {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('اكتب اسم طريقة الدفع.')
      return
    }
    const added = await persist([...methods, createPaymentMethod(trimmed, account)])
    if (added) {
      setNewName('')
      setNewAccount('')
    }
  }

  return (
    <div className="space-y-5">
      <section className="neuro-raised rounded-3xl p-5">
        <h3 className="neuro-text mb-3 text-xl font-bold">ربط يوتيوب</h3>
        <p className="neuro-text-muted mb-4 text-sm">
          بعد الربط تقدر ترفع من المنصة. لو الـ API مش جاهز، لصق الرابط يفضل شغال.
        </p>
        {params.get('youtube') === 'connected' ? <p className="mb-3 text-sm neuro-accent">القناة اتربطت</p> : null}
        <Button
          onClick={async () => {
            const result = await startYoutube()
            if ('data' in result && result.data?.url) window.location.href = result.data.url
          }}
        >
          ربط قناة يوتيوب
        </Button>
      </section>
      <section className="neuro-raised-sm space-y-4 rounded-3xl p-5">
        <h3 className="neuro-text text-xl font-bold">واترمارك الفيديو</h3>
        <p className="neuro-text-muted text-sm leading-7">
          اسم الطالب بيظهر صغير وشفاف وبيتحرك على الفيديو. من هنا تقدر تشغّله أو تطفيه، وتختار يبقى متحرك أو ثابت في ركن.
        </p>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={watermarkEnabled} onChange={(event) => setWatermarkEnabled(event.target.checked)} />
          تشغيل الووترمارك على فيديوهات الدروس
        </label>
        <label className="block space-y-2">
          <span className="neuro-text text-sm font-semibold">شكل الووترمارك</span>
          <select
            className="neuro-input w-full rounded-2xl px-4 py-3"
            value={watermarkPosition}
            onChange={(event) => setWatermarkPosition(event.target.value as WatermarkPosition)}
            disabled={!watermarkEnabled}
          >
            {(['moving', 'top-right', 'top-left', 'bottom-right', 'bottom-left'] as WatermarkPosition[]).map((item) => (
              <option key={item} value={item}>
                {watermarkPositionLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <p className="neuro-text-muted text-sm">بعد التعديل اضغط حفظ. التغيير يطبّق على فيديوهات الطالب فورًا.</p>
        <Button onClick={() => void saveWatermark({ enabled: watermarkEnabled, position: watermarkPosition })}>
          حفظ الووترمارك
        </Button>
      </section>
      <section className="neuro-raised-sm space-y-4 rounded-3xl p-5">
        <h3 className="neuro-text text-xl font-bold">طرق الدفع</h3>
        <p className="neuro-text-muted text-sm leading-7">
          ضيف أو احذف أو عدّل الاسم والرقم زي ما تحب. الطالب هيشوف الطرق المفعّلة بس في الدروب داون.
        </p>
        {methods.length === 0 ? <p className="neuro-text-muted text-sm">مفيش طرق دفع دلوقتي. ضيف واحدة من تحت.</p> : null}
        {methods.map((method, index) => (
          <article key={method.id} className="neuro-pressed space-y-3 rounded-3xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={method.enabled}
                  onChange={(event) => {
                    const enabled = event.target.checked
                    void persist(methods.map((item, itemIndex) => (itemIndex === index ? { ...item, enabled } : item)))
                  }}
                />
                ظاهرة للطالب
              </label>
              <div className="flex items-center gap-1">
                <IconButton label="تحريك لأعلى" onClick={() => moveMethod(index, -1)}>
                  <ChevronUp className="h-4 w-4" />
                </IconButton>
                <IconButton label="تحريك لأسفل" onClick={() => moveMethod(index, 1)}>
                  <ChevronDown className="h-4 w-4" />
                </IconButton>
                <IconButton label="حذف" danger onClick={() => setDeleting(method)}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                id={`method-name-${method.id}`}
                label="اسم الطريقة"
                value={method.name}
                onChange={(event) => updateMethod(index, { name: event.target.value })}
              />
              <Input
                id={`method-account-${method.id}`}
                label="الرقم أو الحساب"
                value={method.account}
                onChange={(event) => updateMethod(index, { account: event.target.value })}
                ltr
              />
            </div>
          </article>
        ))}
        {quickAdd.length ? (
          <div className="space-y-2">
            <p className="neuro-text-muted text-sm">إضافة سريعة للمحافظ الجاهزة:</p>
            <div className="flex flex-wrap gap-2">
              {quickAdd.map((item) => (
                <Button key={item.id} variant="raised" onClick={() => void addMethod(item.name, item.account)}>
                  {item.name}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        <form
          className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            void addMethod(newName, newAccount)
          }}
        >
          <Input label="اسم طريقة جديدة" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="مثلاً تحويل بنكي" />
          <Input label="الرقم أو الحساب" value={newAccount} onChange={(event) => setNewAccount(event.target.value)} placeholder="010..." ltr />
          <Button type="submit">
            <Plus className="h-4 w-4" />
            إضافة
          </Button>
        </form>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {message ? <p className="text-sm neuro-accent">{message}</p> : null}
        <Button disabled={saveState.isLoading} onClick={() => void persist(methods)}>
          {saveState.isLoading ? 'بيتحفظ...' : 'حفظ التعديلات'}
        </Button>
      </section>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="حذف طريقة الدفع"
        text={deleting ? `هتتمسح ${deleting.name} من قائمة التحويل. الطالب مش هيقدر يختارها بعد الحفظ.` : ''}
        confirmLabel="حذف"
        busy={saveState.isLoading}
        onConfirm={() => {
          if (!deleting) return
          const next = methods.filter((item) => item.id !== deleting.id)
          setDeleting(null)
          void persist(next)
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
