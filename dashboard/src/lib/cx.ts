export function cx(...parts: Array<string | number | boolean | null | undefined>) {
  return parts.filter((part): part is string => typeof part === 'string' && part.length > 0).join(' ')
}
