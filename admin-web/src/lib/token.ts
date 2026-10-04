/**
 * The admin JWT lives in sessionStorage only — never in source code, a cookie this app sets
 * itself, or a URL param — and only for the lifetime of this browser tab. Never log the value
 * anywhere in this module or its callers.
 */

const TOKEN_KEY = 'pathora_admin_token'

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    // sessionStorage can throw in some private-browsing modes — treat as "no session".
    return null
  }
}

export function storeToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    // If storage isn't available the session just won't survive a reload; never throw here.
  }
}

export function clearStoredToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}
