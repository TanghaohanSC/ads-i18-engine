import { api, clearTokens, setTokens } from './api';

export type User = {
  id: string;
  email: string;
  name: string;
  primary_role: 'ad_ops' | 'brand_admin' | 'system_admin';
  is_system_admin: boolean;
  is_active: boolean;
  memberships: Array<{ brand_id: string; role: string }>;
};

type TokenPair = { access_token: string; refresh_token: string };

export async function login(email: string, password: string) {
  const tokens = await api<TokenPair>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setTokens(tokens.access_token, tokens.refresh_token);
  return tokens;
}

export async function me(): Promise<User> {
  return api<User>('/v1/auth/me');
}

export function signOut() {
  clearTokens();
  if (typeof window !== 'undefined') window.location.href = '/login';
}
