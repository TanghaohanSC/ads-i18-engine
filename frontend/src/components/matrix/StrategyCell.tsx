'use client';

import { useState } from 'react';
import type { MatrixCell } from '@/lib/jobs';
import { strategiesFor } from '@/lib/jobs';
import { cn } from '@/lib/cn';

const STRATEGY_STYLES: Record<string, string> = {
  keep_original: 'bg-slate-100 text-slate-800',
  literal_translate: 'bg-blue-100 text-blue-900',
  light_localize: 'bg-emerald-100 text-emerald-900',
  transcreate: 'bg-violet-100 text-violet-900',
  user_provided: 'bg-amber-100 text-amber-900',
  replace_for_compliance: 'bg-red-100 text-red-900',
  localize_culturally: 'bg-violet-100 text-violet-900',
  custom_replace: 'bg-amber-100 text-amber-900',
  add_subtitles_only: 'bg-emerald-100 text-emerald-900',
  replace_dialogue: 'bg-violet-100 text-violet-900',
  keep_with_subtitles: 'bg-slate-100 text-slate-800',
};

const CODE: Record<string, string> = {
  keep_original: 'KO',
  literal_translate: 'LT',
  light_localize: 'LL',
  transcreate: 'TC',
  user_provided: 'UP',
  replace_for_compliance: 'RC',
  localize_culturally: 'LC',
  custom_replace: 'CR',
  add_subtitles_only: 'SO',
  replace_dialogue: 'RD',
  keep_with_subtitles: 'WS',
};

const INPUT_STRATEGIES = new Set([
  'user_provided',
  'custom_replace',
]);

export function StrategyCell({
  luType,
  value,
  disabled,
  onChange,
  onContentChange,
}: {
  luType: 'text' | 'visual' | 'audio';
  value: MatrixCell;
  disabled?: boolean;
  onChange: (next: string) => void;
  onContentChange?: (content: {
    user_provided_content?: string;
    user_instructions?: string;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [contentDraft, setContentDraft] = useState(
    value.user_provided_content ?? '',
  );
  const [instructionDraft, setInstructionDraft] = useState(
    value.user_instructions ?? '',
  );
  const strategies = strategiesFor(luType);
  const code = CODE[value.strategy] ?? '??';
  const pill = STRATEGY_STYLES[value.strategy] ?? 'bg-slate-100';
  const needsInput = INPUT_STRATEGIES.has(value.strategy);

  if (disabled) {
    return (
      <span
        title={value.strategy}
        className={cn(
          'inline-flex h-7 w-12 items-center justify-center rounded font-mono text-xs opacity-60',
          pill,
        )}
      >
        {code}
      </span>
    );
  }

  function saveInput() {
    onContentChange?.({
      user_provided_content:
        value.strategy === 'user_provided' ? contentDraft : undefined,
      user_instructions:
        value.strategy === 'custom_replace' ? instructionDraft : undefined,
    });
    setEditorOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={
          needsInput && !value.user_provided_content && !value.user_instructions
            ? `${value.strategy} (input missing)`
            : value.strategy
        }
        className={cn(
          'relative inline-flex h-7 w-12 items-center justify-center rounded font-mono text-xs transition hover:brightness-95',
          pill,
        )}
      >
        {code}
        {needsInput &&
        !(value.user_provided_content || value.user_instructions) ? (
          <span
            aria-label="input required"
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500"
          />
        ) : null}
      </button>

      {open ? (
        <div className="absolute left-0 top-8 z-10 min-w-[180px] rounded-md border bg-popover text-sm shadow-lg">
          {strategies.map((s) => (
            <button
              key={s}
              type="button"
              className={cn(
                'flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-accent',
                s === value.strategy && 'bg-accent/60',
              )}
              onClick={() => {
                setOpen(false);
                if (s !== value.strategy) onChange(s);
                if (INPUT_STRATEGIES.has(s)) setEditorOpen(true);
              }}
            >
              <span>{s}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {CODE[s] ?? ''}
              </span>
            </button>
          ))}
          {needsInput ? (
            <button
              type="button"
              className="block w-full border-t px-3 py-1.5 text-left text-xs text-primary hover:bg-accent"
              onClick={() => {
                setOpen(false);
                setEditorOpen(true);
              }}
            >
              Edit {value.strategy === 'user_provided' ? 'target text' : 'instructions'}…
            </button>
          ) : null}
        </div>
      ) : null}

      {editorOpen ? (
        <div className="absolute left-0 top-8 z-20 w-72 rounded-md border bg-popover p-3 shadow-lg">
          {value.strategy === 'user_provided' ? (
            <>
              <label className="block text-xs font-medium">
                Target text for this market
              </label>
              <textarea
                className="mt-1 w-full rounded border px-2 py-1 text-xs"
                rows={3}
                value={contentDraft}
                onChange={(e) => setContentDraft(e.target.value)}
                placeholder="Type the translation / transcreation to use verbatim"
              />
            </>
          ) : (
            <>
              <label className="block text-xs font-medium">
                Edit instructions for Nano Banana
              </label>
              <textarea
                className="mt-1 w-full rounded border px-2 py-1 text-xs"
                rows={3}
                value={instructionDraft}
                onChange={(e) => setInstructionDraft(e.target.value)}
                placeholder="Describe the visual replacement (e.g. 'replace football with cricket bat')"
              />
            </>
          )}
          <div className="mt-2 flex justify-end gap-1">
            <button
              className="rounded border px-2 py-0.5 text-xs"
              onClick={() => setEditorOpen(false)}
            >
              Cancel
            </button>
            <button
              className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground"
              onClick={saveInput}
            >
              Save
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
