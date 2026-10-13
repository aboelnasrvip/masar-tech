const KEY = 'masar-pending-email'

export function setPendingEmail(email: string) {
  window.localStorage.setItem(KEY, email)
}

export function getPendingEmail() {
  return window.localStorage.getItem(KEY) ?? ''
}

export function clearPendingEmail() {
  window.localStorage.removeItem(KEY)
}
