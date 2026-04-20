'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deletePrompt,
  listPrompts,
  previewAssembly,
  PROMPT_MODES,
  PROMPT_USE_CASES,
  type AssemblyPreview,
  type PromptOverride,
} from '@/lib/prompts';
import { listSubMarkets, type SubMarket } from '@/lib/sub_markets';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { upsertPrompt } from '@/lib/prompts';
import { cn } from '@/lib/cn';

type Key = { use_case: string; market: string; mode: string };

export function PromptsTab() {
  const qc = useQueryClient();
  const prompts = useQuery({ queryKey: ['prompts'], queryFn: () => listPrompts() });
  const subMarkets = useQuery({
    queryKey: ['sub-markets'],
    queryFn: () => listSubMarkets(),
  });

  const [useCase, setUseCase] = useState<string>('text_transcreate');
  const [market, setMarket] = useState<string>('');
  const [mode, setMode] = useState<string>('');
  const [editor, setEditor] = useState<{ key: Key; draft: string; notes: string } | null>(null);

  const byKey = useMemo(() => {
    const m = new Map<string, PromptOverride>();
    for (const p of prompts.data ?? []) {
      m.set(`${p.use_case}|${p.market}|${p.mode}`, p);
    }
    return m;
  }, [prompts.data]);

  const existing = byKey.get(`${useCase}|${market}|${mode}`);

  const markets = useMemo(() => {
    const parents = new Set<string>();
    const subs: SubMarket[] = [];
    for (const s of subMarkets.data ?? []) {
      parents.add(s.parent_market);
      if (s.id !== s.parent_market) subs.push(s);
    }
    return {
      parents: Array.from(parents).sort(),
      subs: subs.sort((a, b) => a.id.localeCompare(b.id)),
    };
  }, [subMarkets.data]);

  function openEditor() {
    setEditor({
      key: { use_case: useCase, market, mode },
      draft: existing?.content ?? '',
      notes: existing?.notes ?? '',
    });
  }

  const save = useMutation({
    mutationFn: () =>
      upsertPrompt({
        use_case: editor!.key.use_case,
        market: editor!.key.market,
        mode: editor!.key.mode,
        content: editor!.draft,
        notes: editor!.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] });
      setEditor(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deletePrompt(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompts'] }),
  });

  const preview = useQuery<AssemblyPreview>({
    queryKey: ['prompts-preview', useCase, market, mode],
    queryFn: () =>
      previewAssembly({
        use_case: useCase,
        market,
        modes: mode ? [mode] : ['language'],
      }),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs">Use case</Label>
          <Select
            className="mt-1"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
          >
            {PROMPT_USE_CASES.map((u) => (
              <option key={u.value} value={u.value}>
                [{u.group}] {u.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label className="text-xs">Mode</Label>
          <Select
            className="mt-1"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            {PROMPT_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs">Parent market</Label>
          <Select
            className="mt-1"
            value={markets.parents.includes(market) ? market : ''}
            onChange={(e) => setMarket(e.target.value)}
          >
            <option value="">(any market)</option>
            {markets.parents.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label className="text-xs">Sub-market</Label>
          <Select
            className="mt-1"
            value={markets.subs.some((s) => s.id === market) ? market : ''}
            onChange={(e) => setMarket(e.target.value)}
            disabled={!markets.subs.some((s) => s.parent_market === market) && market !== ''}
          >
            <option value="">(none)</option>
            {markets.subs
              .filter((s) => !market || s.parent_market === market || s.id === market)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} · {s.display_name}
                </option>
              ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* Left: current override + editor */}
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Override for this slot</p>
              <p className="font-mono text-xs text-muted-foreground">
                {useCase} · market={market || '*'} · mode={mode || '*'}
              </p>
            </div>
            {existing ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => remove.mutate(existing.id)}
                disabled={remove.isPending}
              >
                Delete
              </Button>
            ) : null}
          </div>

          {editor ? (
            <>
              <textarea
                className="h-56 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                value={editor.draft}
                onChange={(e) =>
                  setEditor({ ...editor, draft: e.target.value })
                }
                placeholder="Free-form text. Will be wrapped as [Admin override — market=… mode=…] in the assembled system prompt."
              />
              <input
                className="h-9 w-full rounded-md border bg-transparent px-3 text-xs"
                value={editor.notes}
                onChange={(e) =>
                  setEditor({ ...editor, notes: e.target.value })
                }
                placeholder="Optional notes (internal — not shown to the LLM)"
              />
              {save.isError ? (
                <p className="text-xs text-destructive">
                  {save.error instanceof Error ? save.error.message : String(save.error)}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
                  {save.isPending ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditor(null)}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {existing ? (
                <pre className="max-h-56 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                  {existing.content}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No override set for this slot. Less-specific overrides (e.g.
                  use_case with market=&quot;*&quot;) may still apply.
                </p>
              )}
              <Button size="sm" onClick={openEditor}>
                {existing ? 'Edit' : 'Create override'}
              </Button>
            </>
          )}
        </div>

        {/* Right: assembly preview */}
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div>
            <p className="text-sm font-semibold">Effective assembled prompt</p>
            <p className="text-xs text-muted-foreground">
              Recomputed live. Overrides at other scopes can layer in —
              sub-market &gt; parent &gt; global.
            </p>
          </div>
          {preview.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : preview.isError ? (
            <p className="text-xs text-destructive">
              {preview.error instanceof Error
                ? preview.error.message
                : 'preview failed'}
            </p>
          ) : preview.data ? (
            <>
              <div className="flex gap-2 text-[11px]">
                <span className="rounded bg-slate-100 px-2 py-0.5">
                  tokens ≈ {preview.data.token_estimate}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5">
                  layers {preview.data.layers.length}
                </span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-900">
                  overrides {preview.data.overrides_applied.length}
                </span>
              </div>
              <pre className="max-h-[420px] overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                {preview.data.system_prompt}
              </pre>
              <details className="rounded-md border p-2">
                <summary className="cursor-pointer text-xs font-medium">
                  Layers breakdown
                </summary>
                <ul className="mt-2 space-y-1 text-xs">
                  {preview.data.layers.map((l) => (
                    <li key={l.name + l.priority}>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        p{l.priority}
                      </span>{' '}
                      <span className="font-semibold">{l.name}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          ) : null}
        </div>
      </div>

      {/* Global list of every override for quick jumping */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-2 text-sm font-semibold">
          All overrides ({(prompts.data ?? []).length})
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Use case</th>
                <th className="px-3 py-2">Market</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2">Content</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(prompts.data ?? []).map((p) => (
                <tr
                  key={p.id}
                  className={cn(
                    'border-t',
                    p.use_case === useCase &&
                      p.market === market &&
                      p.mode === mode
                      ? 'bg-accent/30'
                      : '',
                  )}
                >
                  <td className="px-3 py-1.5 font-mono text-xs">{p.use_case}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{p.market || '*'}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{p.mode || '*'}</td>
                  <td className="max-w-[360px] px-3 py-1.5 text-xs text-muted-foreground">
                    <p className="truncate" title={p.content}>
                      {p.content}
                    </p>
                  </td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setUseCase(p.use_case);
                        setMarket(p.market);
                        setMode(p.mode);
                      }}
                    >
                      Jump
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
