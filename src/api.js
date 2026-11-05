const BASE = '/api'

function buildQuery(params = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === 'all') continue
    query.set(key, value)
  }
  const text = query.toString()
  return text ? `?${text}` : ''
}

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const contentType = response.headers.get('content-type') || ''
  let data = null
  if (response.status !== 204) {
    data = contentType.includes('application/json')
      ? await response.json()
      : await response.text()
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && data.error
        ? data.error
        : 'Não foi possível concluir a operação.'
    throw new Error(message)
  }

  return data
}

export const api = {
  categories: {
    list: (type) => request(`/categories${buildQuery({ type })}`),
    create: (data) => request('/categories', { method: 'POST', body: data }),
    update: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
  },
  bills: {
    list: (resource, params) => request(`/${resource}${buildQuery(params)}`),
    create: (resource, data) => request(`/${resource}`, { method: 'POST', body: data }),
    update: (resource, id, data) =>
      request(`/${resource}/${id}`, { method: 'PUT', body: data }),
    remove: (resource, id) => request(`/${resource}/${id}`, { method: 'DELETE' }),
    settle: (resource, id, data) =>
      request(`/${resource}/${id}/settle`, { method: 'PATCH', body: data }),
    revert: (resource, id) =>
      request(`/${resource}/${id}/revert`, { method: 'PATCH' }),
  },
  dashboard: () => request('/dashboard'),
  reports: (params) => request(`/reports${buildQuery(params)}`),
  reportExportUrl: (params) => `${BASE}/reports/export${buildQuery(params)}`,
}
