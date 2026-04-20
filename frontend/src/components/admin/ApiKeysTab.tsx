'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listSettings, setSetting, type Setting } from '@/lib/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

const SOURCE_STYLE: Record<Setting['source'], string> = {
  db: 'bg-emerald-100 text-emerald-800',
  env: 'bg-blue-100 text-blue-800',
  none: 'bg-slate-100 text-slate-700',
};

type Column = {
  key: string;
  label: string;
  placeholder: string;
};

type SectionDef = {
  title: string;
  description: string;
  columns: Column[]; // 1 or 2 columns. Two-column = generator + reviewer.
  defaultOpen: boolean;
};

const SECTIONS: SectionDef[] = [
  {
    title: 'OpenRouter API key',
    description:
      'Single key for every AI call in the app. Get one at openrouter.ai/keys.',
    columns: [
      {
        key: 'openrouter_api_key',
        label: 'API key',
        placeholder: 'sk-or-v1-…',
      },
    ],
    defaultOpen: true,
  },
  {
    title: 'Text localization',
    description:
      'Runs literal_translate / light_localize / transcreate, then the reviewer scores the output for fidelity, voice, and compliance.',
    columns: [
      {
        key: 'openrouter_model',
        label: 'Generator model',
        placeholder: 'e.g. anthropic/claude-sonnet-4.5',
      },
      {
        key: 'openrouter_text_review_model',
        label: 'Review model',
        placeholder: 'e.g. anthropic/claude-opus-4',
      },
    ],
    defaultOpen: true,
  },
  {
    title: 'Vision parsing',
    description:
      'Multimodal LLM that decomposes flat images into Localizable Units. No review step (this is upstream of output).',
    columns: [
      {
        key: 'openrouter_vision_model',
        label: 'Parser model',
        placeholder: 'e.g. google/gemini-2.5-pro',
      },
    ],
    defaultOpen: true,
  },
  {
    title: 'Image editing',
    description:
      'Nano Banana-class mask editor. After each edit the reviewer scores mask respect, composition preservation, and compliance.',
    columns: [
      {
        key: 'openrouter_image_edit_model',
        label: 'Editor model',
        placeholder: 'e.g. google/gemini-2.5-flash-image-preview',
      },
      {
        key: 'openrouter_image_review_model',
        label: 'Review model',
        placeholder: 'e.g. google/gemini-2.5-pro',
      },
    ],
    defaultOpen: true,
  },
  {
    title: 'Video',
    description:
      'Replaces audio / regenerates video while keeping frames bit-identical. Videos are not reviewed by a second model.',
    columns: [
      {
        key: 'openrouter_video_model',
        label: 'Video model',
        placeholder: 'e.g. google/veo-3.1 or kuaishou/kling-v1.6',
      },
    ],
    defaultOpen: true,
  },
];

export function ApiKeysTab() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: listSettings,
  });

  if (settings.isLoading)
    return <p className="text-sm text-muted-foreground">Loading…</p>;

  const byKey: Record<string, Setting> = {};
  for (const s of settings.data ?? []) byKey[s.key] = s;

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Values are stored in the <code>system_settings</code> table in plain
        text for V1. Production should load secrets from a managed provider
        (AWS Secrets Manager, Vault) and leave these unset.
      </div>

      {SECTIONS.map((section) => (
        <Section
          key={section.title}
          section={section}
          settings={byKey}
          onSaved={() => qc.invalidateQueries({ queryKey: ['settings'] })}
        />
      ))}
    </div>
  );
}

function Section({
  section,
  settings,
  onSaved,
}: {
  section: SectionDef;
  settings: Record<string, Setting>;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(section.defaultOpen);

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between px-4 py-3 text-left transition-colors hover:bg-accent/40"
      >
        <div>
          <div className="text-sm font-semibold">{section.title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {section.description}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{open ? '▲' : '▼'}</span>
      </button>

      {open ? (
        <div
          className={cn(
            'grid gap-4 border-t p-4',
            section.columns.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1',
          )}
        >
          {section.columns.map((col) => {
            const s = settings[col.key];
            if (!s) return null;
            return (
              <SettingColumn
                key={col.key}
                setting={s}
                column={col}
                onSaved={onSaved}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function SettingColumn({
  setting,
  column,
  onSaved,
}: {
  setting: Setting;
  column: Column;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState('');
  const save = useMutation({
    mutationFn: () => setSetting(setting.key, draft),
    onSuccess: () => {
      onSaved();
      setDraft('');
    },
  });
  const canSave = draft.length > 0 && !save.isPending;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{column.label}</p>
          <p className="font-mono text-[10px] text-muted-foreground">
            {setting.key}
          </p>
        </div>
        <span
          className={cn(
            'rounded px-2 py-0.5 text-[10px] uppercase',
            SOURCE_STYLE[setting.source],
          )}
        >
          {setting.source}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">{setting.description}</p>

      <p className="font-mono text-xs text-muted-foreground truncate">
        {setting.has_value ? setting.value_masked : '(unset)'}
      </p>

      <div className="flex gap-2">
        <Input
          type={setting.category === 'secret' ? 'password' : 'text'}
          placeholder={column.placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button size="sm" disabled={!canSave} onClick={() => save.mutate()}>
          {save.isPending ? '…' : 'Save'}
        </Button>
      </div>

      {save.isError ? (
        <p className="text-xs text-destructive">
          {save.error instanceof Error ? save.error.message : String(save.error)}
        </p>
      ) : null}
    </div>
  );
}
