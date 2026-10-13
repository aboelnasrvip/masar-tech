import { useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Button } from '@/components/ui/Button'

type Props = {
  html: string
  css: string
  js: string
  onChange: (next: { html: string; css: string; js: string }) => void
  onSave: () => void
}

export function WebEditor({ html, css, js, onChange, onSave }: Props) {
  const [tab, setTab] = useState<'html' | 'css' | 'js'>('html')
  const [src, setSrc] = useState('')

  const value = tab === 'html' ? html : tab === 'css' ? css : js

  const preview = useMemo(
    () => `<!doctype html><html><head><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`,
    [html, css, js],
  )

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="neuro-raised-sm rounded-3xl p-4">
        <div className="mb-3 flex gap-2">
          {(['html', 'css', 'js'] as const).map((item) => (
            <Button key={item} variant={tab === item ? 'primary' : 'raised'} onClick={() => setTab(item)}>
              {item.toUpperCase()}
            </Button>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl" dir="ltr">
          <Editor
            height="320px"
            theme="vs-dark"
            language={tab === 'js' ? 'javascript' : tab}
            value={value}
            onChange={(next) => onChange({ html, css, js, [tab]: next ?? '' })}
            options={{ minimap: { enabled: false }, fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={() => setSrc(preview)}>تشغيل</Button>
          <Button variant="raised" onClick={onSave}>
            حفظ الكود
          </Button>
        </div>
      </div>
      <iframe title="معاينة" className="neuro-pressed min-h-80 w-full rounded-3xl bg-white" sandbox="allow-scripts" srcDoc={src} />
    </div>
  )
}
