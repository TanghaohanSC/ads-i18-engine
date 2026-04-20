import { api } from './api';

export type Severity = 'critical' | 'warning' | 'info';

export type Finding = {
  rule_id: string;
  rule_code: string;
  rule_version: number;
  severity: Severity;
  message: string;
  suggested_fix: string | null;
  regulation_reference: string | null;
  detected_content: string | null;
  trigger_location: Record<string, unknown> | null;
  reason_required: boolean;
  deferred: boolean;
};

export type CheckResult = {
  market: string;
  sub_market: string | null;
  overall_status: string;
  findings: Finding[];
  effective_rule_count: number;
  disabled_rule_count: number;
};

export type Acknowledgment = {
  rule_id: string;
  rule_version: number;
  severity: Severity;
  reason_provided?: string;
};

export type Confirmation = {
  id: string;
  localized_asset_id: string;
  confirmed_by: string;
  confirmed_at: string;
  effective_rules_snapshot_hash: string;
  acknowledgments: Array<Record<string, unknown>>;
};

export function runCheck(localizedAssetId: string) {
  return api<CheckResult>(`/v1/compliance/check/${localizedAssetId}`, {
    method: 'POST',
  });
}

export function confirmAsset(
  localizedAssetId: string,
  body: {
    acknowledgments: Acknowledgment[];
    comments?: string[];
  },
) {
  return api<Confirmation>(`/v1/compliance/confirm/${localizedAssetId}`, {
    method: 'POST',
    body: JSON.stringify({ acknowledgments: body.acknowledgments, comments: body.comments ?? [] }),
  });
}
