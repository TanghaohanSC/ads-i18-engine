import { API_BASE_URL, api, getAccessToken } from './api';

export type SourceAsset = {
  id: string;
  project_id: string;
  brand_id: string;
  source_type: 'psd' | 'ai' | 'png' | 'jpg' | 'mp4';
  original_filename: string;
  storage_key: string;
  size_bytes: number;
  has_editable_layers: boolean;
  parse_status: 'pending' | 'parsing' | 'parsed' | 'failed';
  parse_error: string | null;
  created_at: string;
};

export type ParsedAssetDetail = {
  id: string;
  source_asset_id: string;
  parse_method: string;
  parse_model_used: string | null;
  parse_confidence: number | null;
  parse_warnings: string[];
  structural_metadata: Record<string, unknown>;
  parsed_at: string | null;
  localizable_units: Array<{
    id: string;
    lu_type: 'text' | 'visual' | 'audio';
    semantic_role: string | null;
    source_content: Record<string, unknown>;
  }>;
};

export function listAssets(project_id: string) {
  return api<SourceAsset[]>(`/v1/assets?project_id=${encodeURIComponent(project_id)}`);
}

export async function uploadAsset(params: {
  project_id: string;
  file: File;
  tags?: string;
}): Promise<SourceAsset> {
  const form = new FormData();
  form.append('project_id', params.project_id);
  form.append('file', params.file);
  if (params.tags) form.append('tags', params.tags);
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/v1/assets/upload`, {
    method: 'POST',
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      /* noop */
    }
    throw new Error(String(detail));
  }
  return res.json();
}

export function parseNow(sourceAssetId: string) {
  return api(`/v1/parsed/source/${sourceAssetId}/parse`, { method: 'POST' });
}

export function getParsed(sourceAssetId: string) {
  return api<ParsedAssetDetail>(`/v1/parsed/source/${sourceAssetId}`);
}

export function uploadText(params: {
  project_id: string;
  content: string;
  filename?: string;
  format?: 'txt' | 'md' | 'csv';
}): Promise<SourceAsset> {
  return api<SourceAsset>('/v1/assets/upload-text', {
    method: 'POST',
    body: JSON.stringify({
      project_id: params.project_id,
      content: params.content,
      filename: params.filename,
      format: params.format ?? 'txt',
    }),
  });
}
