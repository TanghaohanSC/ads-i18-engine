import { api } from './api';

export type OverrideType = 'add' | 'tighten' | 'relax' | 'disable';

export type BrandOverride = {
  id: string;
  brand_id: string;
  system_rule_id: string | null;
  override_type: OverrideType;
  modifications: Record<string, unknown>;
  new_rule_definition: Record<string, unknown> | null;
  change_reason: string;
  effective_from: string | null;
  effective_to: string | null;
  version: number;
  is_active: boolean;
  created_at: string;
};

export function listOverrides(brandId: string) {
  return api<BrandOverride[]>(`/v1/overrides/brand/${brandId}`);
}

export function createOverride(
  brandId: string,
  body: {
    system_rule_id?: string | null;
    override_type: OverrideType;
    modifications?: Record<string, unknown>;
    new_rule_definition?: Record<string, unknown> | null;
    change_reason: string;
  },
) {
  return api<BrandOverride>(`/v1/overrides/brand/${brandId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function deactivateOverride(overrideId: string) {
  return api<BrandOverride>(`/v1/overrides/${overrideId}/deactivate`, {
    method: 'PATCH',
  });
}
