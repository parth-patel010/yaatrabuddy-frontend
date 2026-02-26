/**
 * API client for the Node backend (Neon). All requests use Authorization: Bearer <token> when token is set.
 */

const getBaseUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3000';

let getToken: (() => string | null) | null = null;
export function setAuthTokenGetter(fn: () => string | null) {
  getToken = fn;
}

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string> } = {}
): Promise<T> {
  const { params, ...init } = options;
  let url = `${getBaseUrl().replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  if (params && Object.keys(params).length > 0) {
    const search = new URLSearchParams(params).toString();
    url += (url.includes('?') ? '&' : '?') + search;
  }
  const headers: HeadersInit = {
    ...(init.headers as Record<string, string>),
  };
  const token = getToken?.() ?? null;
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  if (!(init.body instanceof FormData) && typeof init.body !== 'string') {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText;
    try {
      const j = JSON.parse(text);
      if (j?.error) message = j.error;
    } catch (_) {}
    throw new Error(message);
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>) =>
    request<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),

  postForm: <T>(path: string, body: FormData) =>
    request<T>(path, { method: 'POST', body }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),

  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};

export default api;
