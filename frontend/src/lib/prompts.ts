import { api } from './api';

export type PromptOverride = {
  id: string;
  use_case: string;
  market: string;
  mode: string;
  content: string;
  notes: string;
  is_active: boolean;
  updated_at: string;
};

export type AssemblyPreview = {
  system_prompt: string;
  user_prompt: string;
  negative_prompt: string | null;
  token_estimate: number;
  layers: Array<{
    name: string;
    priority: number;
    contribution: Record<string, unknown>;
  }>;
  overrides_applied: Array<{ scope: string; content: string }>;
};

export function listPrompts(filter?: {
  use_case?: string;
  market?: string;
  mode?: string;
}) {
  const qs = new URLSearchParams();
  if (filter?.use_case) qs.set('use_case', filter.use_case);
  if (filter?.market !== undefined) qs.set('market', filter.market);
  if (filter?.mode !== undefined) qs.set('mode', filter.mode);
  const s = qs.toString();
  return api<PromptOverride[]>('/v1/prompts' + (s ? `?${s}` : ''));
}

export function upsertPrompt(body: {
  use_case: string;
  market?: string;
  mode?: string;
  content: string;
  notes?: string;
  is_active?: boolean;
}) {
  return api<PromptOverride>('/v1/prompts', {
    method: 'PUT',
    body: JSON.stringify({
      market: '',
      mode: '',
      notes: '',
      is_active: true,
      ...body,
    }),
  });
}

export function deletePrompt(id: string) {
  return api<void>(`/v1/prompts/${id}`, { method: 'DELETE' });
}

export function previewAssembly(body: {
  use_case: string;
  market?: string;
  sub_market?: string | null;
  modes?: string[];
  brand_id?: string;
  campaign_id?: string;
}) {
  return api<AssemblyPreview>('/v1/prompts/preview', {
    method: 'POST',
    body: JSON.stringify({
      market: '',
      modes: ['language'],
      ...body,
    }),
  });
}

export const PROMPT_USE_CASES: Array<{
  value: string;
  label: string;
  group: string;
}> = [
  { value: 'source_parse', label: 'Source parsing', group: 'Parser' },
  { value: 'text_literal', label: 'Literal translate', group: 'Text' },
  { value: 'text_light', label: 'Light localize', group: 'Text' },
  { value: 'text_transcreate', label: 'Transcreate', group: 'Text' },
  {
    value: 'image_text_replace',
    label: 'Image text replace',
    group: 'Image',
  },
  {
    value: 'image_element_replace',
    label: 'Image element replace',
    group: 'Image',
  },
  {
    value: 'image_element_remove',
    label: 'Image element remove',
    group: 'Image',
  },
  { value: 'video_text_replace', label: 'Video text replace', group: 'Video' },
  { value: 'video_audio_replace', label: 'Video audio replace', group: 'Video' },
  { value: 'compliance_vision', label: 'Compliance vision', group: 'Compliance' },
  { value: 'compliance_explain', label: 'Compliance explain', group: 'Compliance' },
  { value: 'translation_review', label: 'Translation review', group: 'Review' },
  { value: 'image_edit_review', label: 'Image edit review', group: 'Review' },
];

export const PROMPT_MODES = [
  { value: '', label: 'Any mode' },
  { value: 'language', label: 'Language' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'element_replace', label: 'Element replace' },
] as const;
