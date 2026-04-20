import { api } from './api';

export type Brand = {
  id: string;
  name: string;
  slug: string;
  display_name_by_market: Record<string, string>;
  restrictions: Record<string, unknown>;
  voice: Record<string, unknown>;
  lock_brand_name: boolean;
  prompt_additions: string;
  version: number;
  is_active: boolean;
};

export function listBrands() {
  return api<Brand[]>('/v1/brands');
}

export function getBrand(brandId: string) {
  return api<Brand>(`/v1/brands/${brandId}`);
}

export function createBrand(body: {
  name: string;
  slug: string;
  lock_brand_name?: boolean;
}) {
  return api<Brand>('/v1/brands', {
    method: 'POST',
    body: JSON.stringify({
      ...body,
      display_name_by_market: {},
      restrictions: {},
      voice: {},
    }),
  });
}

export function updateBrand(
  brandId: string,
  body: {
    name?: string;
    display_name_by_market?: Record<string, string>;
    restrictions?: Record<string, unknown>;
    voice?: Record<string, unknown>;
    lock_brand_name?: boolean;
    prompt_additions?: string;
    is_active?: boolean;
  },
) {
  return api<Brand>(`/v1/brands/${brandId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
