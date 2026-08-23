const LOGGED_IN_KEY = 'corpus_logged_in'
const USER_KEY = 'corpus_user'

export function saveSession(user) {
  localStorage.setItem(LOGGED_IN_KEY, 'true')
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function isLoggedIn() {
  return localStorage.getItem(LOGGED_IN_KEY) === 'true'
}

export function clearSession() {
  localStorage.removeItem(LOGGED_IN_KEY)
  localStorage.removeItem(USER_KEY)
}
