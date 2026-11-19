import api from './axios.js'

export async function fetchAccessLog({ cursor, type } = {}) {
  const params = {}
  if (cursor) params.cursor = cursor
  if (type) params.type = type
  const { data } = await api.get('/account/access-log', { params })
  return data
}

function saveBlob(blob, fallbackName, disposition) {
  const match = /filename="([^"]+)"/.exec(disposition || '')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = match?.[1] || fallbackName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadAccessLog() {
  const res = await api.get('/account/access-log/download', { responseType: 'blob' })
  saveBlob(res.data, 'corpus-access-log.csv', res.headers['content-disposition'])
}

export async function exportAllData() {
  const res = await api.get('/account/export', { responseType: 'blob' })
  saveBlob(res.data, 'corpus-export.json', res.headers['content-disposition'])
}

export async function signOutEverywhere() {
  const { data } = await api.post('/account/sign-out-everywhere')
  return data
}

export async function deleteAccount(password) {
  const { data } = await api.delete('/account', {
    data: { confirm: 'DELETE MY ACCOUNT', ...(password ? { password } : {}) },
  })
  return data
}
