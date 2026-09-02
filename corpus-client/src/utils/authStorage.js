const LOGGED_IN_KEY = 'corpus_logged_in'
const USER_KEY = 'corpus_user'
const TOKEN_KEY = 'corpus_token'
const REFRESH_TOKEN_KEY = 'corpus_refresh_token'

export function saveSession(user, token = null, refreshToken = null) {
  localStorage.setItem(LOGGED_IN_KEY, 'true')
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || null
}

export function getStoredUser() {
  try {
    const u = localStorage.getItem(USER_KEY)
    return u ? JSON.parse(u) : null
  } catch {
    return null
  }
}

export function isLoggedIn() {
  return localStorage.getItem(LOGGED_IN_KEY) === 'true'
}

export function isTokenValid(token) {
  if (!token) return false
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(atob(parts[1]))
    if (!payload.exp) return true
    return payload.exp * 1000 > Date.now() + 30000 // valid if more than 30s remaining
  } catch {
    return false
  }
}

export function clearSession() {
  localStorage.removeItem(LOGGED_IN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}


