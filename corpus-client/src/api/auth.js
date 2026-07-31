import api from './axios.js'

export async function signupApi(name, email, password) {
  const { data } = await api.post('/auth/signup', { name, email, password })
  return data
}

export async function loginApi(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export async function logoutApi() {
  await api.post('/auth/logout')
}

export async function getMeApi() {
  const { data } = await api.get('/auth/me')
  return data
}

export async function getCredits() {
  const { data } = await api.get('/auth/me')
  return data
}
