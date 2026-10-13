import { useEffect, useRef } from 'react'

export type SecurityEventType =
  | 'lesson_open'
  | 'shortcut_inspect'
  | 'contextmenu'
  | 'copy'
  | 'print'
  | 'tab_hidden'
  | 'tab_visible'
  | 'video_play'
  | 'video_pause'
  | 'video_seek'
  | 'video_fullscreen'
  | 'video_mute'

export type CopyEventDetail = {
  text: string
  method: string
  page: string
}

type ReportFn = (eventType: SecurityEventType, detail?: string) => void

export function copiedTextFromDetail(detail?: string) {
  if (!detail) return ''
  try {
    const parsed = JSON.parse(detail) as { text?: string }
    if (typeof parsed?.text === 'string') return parsed.text
  } catch {
    /* older rows stored plain text */
  }
  return detail
}

function shortcutDetail(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  const code = event.code
  if (event.key === 'F12' || code === 'F12') return 'اختصار F12 — فتح Inspect'
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && (key === 'i' || code === 'KeyI')) {
    return 'اختصار Ctrl+Shift+I — فتح Inspect'
  }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && (key === 'j' || code === 'KeyJ')) {
    return 'اختصار Ctrl+Shift+J — فتح Console'
  }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && (key === 'c' || code === 'KeyC')) {
    return 'اختصار Ctrl+Shift+C — Inspect عنصر'
  }
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && (key === 'u' || code === 'KeyU')) {
    return 'اختصار Ctrl+U — عرض المصدر'
  }
  return null
}

function selectedFromField(target: EventTarget | null) {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? 0
    const end = target.selectionEnd ?? 0
    if (end > start) return target.value.slice(start, end)
  }
  if (target instanceof HTMLElement && target.isContentEditable) {
    return window.getSelection()?.toString() ?? ''
  }
  return ''
}

function currentSelection(target: EventTarget | null = document.activeElement) {
  return (selectedFromField(target) || window.getSelection()?.toString() || '').trim()
}

function looksLikeUrl(value: string) {
  return /https?:\/\/\S+/i.test(value) || /^[\w.-]+\.[a-z]{2,}\/\S+/i.test(value)
}

function copyDetail(text: string, source: string): string {
  const payload: CopyEventDetail = {
    text: text.trim().slice(0, 2000),
    method: looksLikeUrl(text) ? `${source} — رابط` : source,
    page: window.location.href,
  }
  return JSON.stringify(payload)
}

export function useLessonSecurity(enabled: boolean, onEvent: ReportFn, lessonId?: string | null) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!enabled) return
    const report = (type: SecurityEventType, detail?: string) => onEventRef.current(type, detail)
    let keyCopySelection = ''

    if (lessonId) {
      report('lesson_open', `دخل صفحة الدرس — ${window.location.href}`)
    }

    const reportCopy = (text: string, source: string) => {
      report('copy', copyDetail(text, source))
    }

    const captureCopied = (event: ClipboardEvent, fallbackSource: string) => {
      const selected = currentSelection(event.target) || keyCopySelection
      keyCopySelection = ''
      let fromEvent = ''
      try {
        fromEvent = event.clipboardData?.getData('text/plain') || event.clipboardData?.getData('text') || ''
      } catch {
        fromEvent = ''
      }
      const text = (selected || fromEvent).trim()
      const source = selected
        ? 'تحديد من الصفحة'
        : text
          ? fallbackSource
          : `${fallbackSource} — بدون تحديد ظاهر`
      reportCopy(text, source)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcutDetail(event)
      if (shortcut) {
        report('shortcut_inspect', shortcut)
        return
      }
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'c') {
        keyCopySelection = currentSelection(event.target)
        reportCopy(keyCopySelection, keyCopySelection ? 'Ctrl+C' : 'Ctrl+C — بدون تحديد ظاهر')
      }
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'x') {
        keyCopySelection = currentSelection(event.target)
        reportCopy(keyCopySelection, keyCopySelection ? 'Ctrl+X قص' : 'Ctrl+X — بدون تحديد ظاهر')
      }
    }

    const onCopy = (event: ClipboardEvent) => captureCopied(event, 'قائمة النسخ')
    const onCut = (event: ClipboardEvent) => captureCopied(event, 'قص من الصفحة')
    const onContextMenu = () => report('contextmenu', 'ضغط كليك يمين')
    const onPrint = () => report('print', 'حاول يطبع الصفحة')
    const onVisibility = () => {
      if (document.hidden) report('tab_hidden', 'ساب التبويب أو قلل التطبيق')
      else report('tab_visible', 'رجع للصفحة')
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('contextmenu', onContextMenu, true)
    document.addEventListener('copy', onCopy, true)
    document.addEventListener('cut', onCut, true)
    window.addEventListener('beforeprint', onPrint)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('contextmenu', onContextMenu, true)
      document.removeEventListener('copy', onCopy, true)
      document.removeEventListener('cut', onCut, true)
      window.removeEventListener('beforeprint', onPrint)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, lessonId])
}
