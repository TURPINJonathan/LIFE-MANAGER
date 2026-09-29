export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:9100';
  return `${base}${path}`;
}

export async function apiFetch(path: string, init: RequestInit = {}, token?: string | null): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(apiUrl(path), { ...init, headers });
}

export async function readJson<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json();
  return payload as T;
}
