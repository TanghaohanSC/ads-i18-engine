import { api } from './api';

export type Setting = {
  key: string;
  category: 'secret' | 'config';
  description: string | null;
  value_masked: string;
  has_value: boolean;
  source: 'db' | 'env' | 'none';
};

export function listSettings() {
  return api<Setting[]>('/v1/settings');
}

export function setSetting(key: string, value: string) {
  return api<Setting>(`/v1/settings/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}
