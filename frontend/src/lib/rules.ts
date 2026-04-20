import { api } from './api';

export type ComplianceRule = {
  id: string;
  market: string;
  code: string;
  category:
    | 'forbidden_word'
    | 'required_element'
    | 'visual_restriction'
    | 'structural'
    | 'platform_policy'
    | 'scheduling'
    | 'audio_restriction';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  suggested_fix: string | null;
  trigger: Record<string, unknown>;
  regulation_reference: string | null;
  reason_required_by_default: boolean;
  version: number;
  is_active: boolean;
};

export function listRules(market?: string) {
  const q = market ? `?market=${encodeURIComponent(market)}` : '';
  return api<ComplianceRule[]>(`/v1/compliance/rules${q}`);
}
