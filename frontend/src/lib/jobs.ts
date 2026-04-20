import { api } from './api';

export type MarketCode = 'US' | 'UK' | 'PH' | 'IN' | 'BR' | 'FR' | 'DE' | 'NG';

export type MatrixCell = {
  strategy: string;
  user_instructions?: string;
  user_provided_content?: string;
};

export type MatrixRow = {
  lu_id: string;
  lu_type: 'text' | 'visual' | 'audio';
  semantic_role: string | null;
  is_locked: boolean;
  preview: string;
  parser_confidence: number | null;
  cells: Record<string, MatrixCell>;
};

export type MatrixView = {
  job_id: string;
  targets: string[];
  rows: MatrixRow[];
};

export type Job = {
  id: string;
  source_asset_id: string;
  target_markets: string[];
  status:
    | 'draft'
    | 'queued'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'partial';
  started_at: string | null;
  completed_at: string | null;
};

export const TEXT_STRATEGIES = [
  'keep_original',
  'literal_translate',
  'light_localize',
  'transcreate',
  'user_provided',
] as const;

export const VISUAL_STRATEGIES = [
  'keep_original',
  'replace_for_compliance',
  'localize_culturally',
  'custom_replace',
] as const;

export const AUDIO_STRATEGIES = [
  'keep_original',
  'add_subtitles_only',
  'replace_dialogue',
  'keep_with_subtitles',
] as const;

export function strategiesFor(
  luType: 'text' | 'visual' | 'audio',
): readonly string[] {
  if (luType === 'text') return TEXT_STRATEGIES;
  if (luType === 'visual') return VISUAL_STRATEGIES;
  return AUDIO_STRATEGIES;
}

export function getJob(jobId: string) {
  return api<Job>(`/v1/jobs/${jobId}`);
}

export function getMatrix(jobId: string) {
  return api<MatrixView>(`/v1/jobs/${jobId}/matrix`);
}

export function patchCell(
  jobId: string,
  body: {
    lu_id: string;
    target: string;
    strategy: string;
    user_instructions?: string;
    user_provided_content?: string;
  },
) {
  return api<MatrixView>(`/v1/jobs/${jobId}/matrix/cell`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function submitJob(jobId: string) {
  return api<Job>(`/v1/jobs/${jobId}/submit`, { method: 'POST' });
}

export function createJob(body: {
  source_asset_id: string;
  targets: Array<{ market: MarketCode; sub_market?: string }>;
}) {
  return api<Job>('/v1/jobs', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type LocalizedAssetSummary = {
  id: string;
  localization_job_id: string;
  source_asset_id: string;
  target_market: MarketCode;
  target_sub_market: string | null;
  status:
    | 'draft'
    | 'compliance_checking'
    | 'awaiting_confirmation'
    | 'confirmed'
    | 'distributed';
  output_storage_key: string | null;
  output_file_hash: string | null;
  compliance_overlay_applied: boolean;
  platform_metadata: Record<string, unknown>;
  compliance_report_id: string | null;
  confirmation_id: string | null;
  created_at: string;
};

export function listLocalized(jobId: string) {
  return api<LocalizedAssetSummary[]>(`/v1/jobs/${jobId}/localized`);
}
