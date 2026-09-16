export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const w = typeof window === 'undefined' ? null : (window as any)
  const secret = w?.widget?.secret ?? w?.settingsWindow?.secret
  const headers = new Headers(init?.headers)
  if (secret) headers.set('x-usage-secret', secret)
  return fetch(input, { ...init, headers })
}
