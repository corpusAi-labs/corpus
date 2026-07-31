const TOKEN_KEY = 'corpus_token'
const USER_KEY = 'corpus_user'

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
