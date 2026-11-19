import api from './axios.js'

export async function fetchItems({ cursor, type, tag, spaceId, sort } = {}) {
  const params = {}
  if (cursor) params.cursor = cursor
  if (type) params.type = type
  if (tag) params.tag = tag
  if (spaceId) params.spaceId = spaceId
  if (sort) params.sort = sort
  const { data } = await api.get('/items', { params })
  return data
}

export async function searchItems(q, sort, filters = {}) {
  const { data } = await api.get('/items/search', { params: { q, sort, ...filters } })
  return data
}

export async function fetchAllTags() {
  const { data } = await api.get('/items/tags')
  return data
}

export async function createItem(payload) {
  const { data } = await api.post('/items', payload)
  return data
}

export async function updateItem(id, payload) {
  const { data } = await api.patch(`/items/${id}`, payload)
  return data
}

export async function deleteItem(id) {
  const { data } = await api.delete(`/items/${id}`)
  return data
}

export async function uploadImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function fetchDriftItems(limit = 20) {
  const { data } = await api.get('/items/drift', { params: { limit } })
  return data
}

export async function retryItemAI(id) {
  const { data } = await api.post(`/items/${id}/retry-ai`)
  return data
}

export async function uploadPdf(file, { title, spaceId, aiOptOut } = {}, onProgress) {
  const form = new FormData()
  form.append('file', file)
  if (title) form.append('title', title)
  if (spaceId) form.append('spaceId', spaceId)
  if (aiOptOut) form.append('aiOptOut', 'true')
  const { data } = await api.post('/items/pdf', form, {
    onUploadProgress: e => e.total && onProgress?.(Math.round((e.loaded * 100) / e.total)),
  })
  return data
}

export async function fetchItemFile(id) {
  const res = await api.get(`/items/${id}/file`, { responseType: 'blob' })
  return res.data
}

export async function fetchItemText(id) {
  const { data } = await api.get(`/items/${id}/text`)
  return data
}
