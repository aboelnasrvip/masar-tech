export function storageFileName(originalName: string) {
  const lastDot = originalName.lastIndexOf('.')
  const rawExt = lastDot >= 0 ? originalName.slice(lastDot + 1) : ''
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())
  return `${Date.now()}-${id}.${ext || 'bin'}`
}
