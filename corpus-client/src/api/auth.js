import api from './axios.js'

export async function signupApi(name, email, password, confirmPassword) {
  const { data } = await api.post('/auth/signup', { name, email, password, confirmPassword })
  return data
}

export async function verifyOtpApi(email, otp) {
  const { data } = await api.post('/auth/verify-otp', { email, otp })
  return data
}

export async function resendOtpApi(email) {
  const { data } = await api.post('/auth/resend-otp', { email })
  return data
}

export async function loginApi(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export async function logoutApi(refreshToken) {
  await api.post('/auth/logout', { refreshToken })
}

export async function getMeApi() {
  const { data } = await api.get('/auth/me')
  return data
}

export async function getCredits() {
  const { data } = await api.get('/auth/me')
  return data
}
