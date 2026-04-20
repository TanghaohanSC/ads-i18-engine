import Cookies from 'js-cookie';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const ACCESS_COOKIE = 'al_access';
const REFRESH_COOKIE = 'al_refresh';

export function getAccessToken(): string | undefined {
  return Cookies.get(ACCESS_COOKIE);
}

export function setTokens(access: string, refresh: string) {
  // 30-day client-side cookie; access token itself expires server-side.
  Cookies.set(ACCESS_COOKIE, access, { sameSite: 'lax', expires: 30 });
  Cookies.set(REFRESH_COOKIE, refresh, { sameSite: 'lax', expires: 30 });
}

export function clearTokens() {
  Cookies.remove(ACCESS_COOKIE);
  Cookies.remove(REFRESH_COOKIE);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
  }
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      /* noop */
    }
    throw new ApiError(res.status, String(detail));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
