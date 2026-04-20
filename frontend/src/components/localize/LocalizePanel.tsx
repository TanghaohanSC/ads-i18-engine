'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import {
  getParsed,
  listAssets,
  uploadAsset,
  uploadText,
  type SourceAsset,
} from '@/lib/assets';
import {
  createJob,
  listLocalized,
  submitJob,
  type LocalizationModes,
  type LocalizedAssetSummary,
  type MarketCode,
} from '@/lib/jobs';
import { useCurrentBrand } from '@/lib/currentBrand';
import { listProjects, type Project } from '@/lib/projects';
import { listSubMarkets } from '@/lib/sub_markets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { MarketPicker, type MarketPickerValue } from './MarketPicker';
import { cn } from '@/lib/cn';

export type LocalizePanelProps = {
  title: string;
  subtitle: string;
  mediaType: 'text' | 'image' | 'video';
  accept: string;
  allowMultiple: boolean;
  allowPaste?: boolean;
  hint?: string;
};

const STATUS_BADGE: Record<LocalizedAssetSummary['status'], string> = {
  draft: 'bg-slate-100 text-slate-700',
  compliance_checking: 'bg-amber-100 text-amber-800',
  awaiting_confirmation: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  distributed: 'bg-violet-100 text-violet-800',
};

// One upload task in the left column.
type Source =
  | { kind: 'file'; id: string; file: File; previewUrl: string | null; asset?: SourceAsset; jobId?: string }
  | { kind: 'paste'; id: string; content: string; format: 'txt' | 'md'; asset?: SourceAsset; jobId?: string };

function rid() {
  return Math.random().toString(36).slice(2);
}

export function LocalizePanel({
  title,
  subtitle,
  mediaType,
  accept,
  allowMultiple,
  allowPaste,
  hint,
}: LocalizePanelProps) {
  const [brand] = useCurrentBrand();
  const projects = useQuery({
    queryKey: ['projects', brand?.id],
    queryFn: () => listProjects(brand!.id),
    enabled: !!brand,
  });
  const subMarkets = useQuery({
    queryKey: ['sub-markets'],
    queryFn: () => listSubMarkets(),
  });

  const [projectId, setProjectId] = useState<string>('');
  const [sources, setSources] = useState<Source[]>([]);
  const [inputMode, setInputMode] = useState<'file' | 'paste'>(
    allowPaste ? 'paste' : 'file',
  );
  const [pasteDraft, setPasteDraft] = useState('');
  const [pasteFormat, setPasteFormat] = useState<'txt' | 'md'>('txt');

  // Single target market — two-level (parent → optional sub-market).
  const [target, setTarget] = useState<MarketPickerValue>({
    parent: '',
    subMarketId: null,
  });

  // Multi-select modes
  const defaultModes: LocalizationModes = {
    language: true,
    compliance: mediaType !== 'text',
    element_replace: mediaType !== 'text',
  };
  const [modes, setModes] = useState<LocalizationModes>(defaultModes);

  // revoke preview URLs on cleanup
  useEffect(() => {
    return () => {
      sources.forEach((s) => {
        if (s.kind === 'file' && s.previewUrl) URL.revokeObjectURL(s.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const next: Source[] = [];
    for (const file of Array.from(list)) {
      const previewUrl =
        file.type.startsWith('image/') || file.type.startsWith('video/')
          ? URL.createObjectURL(file)
          : null;
      next.push({ kind: 'file', id: rid(), file, previewUrl });
      if (!allowMultiple) break;
    }
    setSources(allowMultiple ? [...sources, ...next] : next);
  }

  function addPaste() {
    if (!pasteDraft.trim()) return;
    setSources([
      ...(allowMultiple ? sources : []),
      { kind: 'paste', id: rid(), content: pasteDraft, format: pasteFormat },
    ]);
    setPasteDraft('');
  }

  function removeSource(id: string) {
    setSources((prev) => {
      const src = prev.find((s) => s.id === id);
      if (src && src.kind === 'file' && src.previewUrl)
        URL.revokeObjectURL(src.previewUrl);
      return prev.filter((s) => s.id !== id);
    });
  }

  // Upload + launch job per source
  const runAll = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('pick a campaign');
      if (!target.parent) throw new Error('pick a target market');
      const targets: Array<{ market: MarketCode; sub_market?: string }> = [
        {
          market: target.parent as MarketCode,
          sub_market: target.subMarketId ?? undefined,
        },
      ];

      const updated: Source[] = [];
      for (const src of sources) {
        if (src.jobId) {
          updated.push(src);
          continue;
        }
        let asset = src.asset;
        if (!asset) {
          if (src.kind === 'file') {
            asset = await uploadAsset({ project_id: projectId, file: src.file });
          } else {
            asset = await uploadText({
              project_id: projectId,
              content: src.content,
              format: src.format,
            });
          }
        }
        // Poll until parsed (short — worker is fast on text/psd; backs off after 20 tries)
        for (let i = 0; i < 30; i++) {
          const list = await listAssets(projectId);
          const current = list.find((a) => a.id === asset!.id);
          if (!current) break;
          asset = current;
          if (current.parse_status === 'parsed') break;
          if (current.parse_status === 'failed') {
            throw new Error(
              `parse failed for ${asset!.original_filename}: ${current.parse_error ?? 'unknown'}`,
            );
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
        if (asset!.parse_status !== 'parsed') {
          throw new Error(
            `parse timed out for ${asset!.original_filename}. Is the worker running?`,
          );
        }
        const job = await createJob({
          source_asset_id: asset!.id,
          targets,
          modes,
        });
        await submitJob(job.id);
        updated.push({ ...src, asset, jobId: job.id });
      }
      setSources(updated);
      return updated;
    },
  });

  const canRun =
    !!brand &&
    !!projectId &&
    !!target.parent &&
    sources.length > 0 &&
    !runAll.isPending &&
    (modes.language || modes.compliance || modes.element_replace);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px_1fr]">
        {/* LEFT — source inputs + previews */}
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">1 · Sources</h2>

          <div>
            <Label className="text-xs">Campaign</Label>
            <Select
              className="mt-1"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">
                {projects.isLoading ? 'Loading…' : '— select campaign —'}
              </option>
              {(projects.data ?? []).map((p: Project) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            {(projects.data ?? []).length === 0 && !projects.isLoading ? (
              <p className="mt-1 text-xs text-amber-300">
                No campaigns yet.{' '}
                <Link className="underline" href="/campaigns">
                  Create one →
                </Link>
              </p>
            ) : null}
          </div>

          {allowPaste ? (
            <div className="flex gap-1 rounded-lg border border-border bg-card-elevated p-0.5 text-xs">
              <button
                type="button"
                className={cn(
                  'flex-1 rounded-md px-2 py-1 transition-colors',
                  inputMode === 'paste'
                    ? 'bg-card font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setInputMode('paste')}
              >
                Paste text
              </button>
              <button
                type="button"
                className={cn(
                  'flex-1 rounded-md px-2 py-1 transition-colors',
                  inputMode === 'file'
                    ? 'bg-card font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setInputMode('file')}
              >
                Upload file
              </button>
            </div>
          ) : null}

          {inputMode === 'paste' && allowPaste ? (
            <div className="space-y-2">
              <textarea
                className="h-40 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                placeholder="Paste source copy here (one block = one source)."
                value={pasteDraft}
                onChange={(e) => setPasteDraft(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Select
                  className="h-9 w-auto text-xs"
                  value={pasteFormat}
                  onChange={(e) =>
                    setPasteFormat(e.target.value as 'txt' | 'md')
                  }
                >
                  <option value="txt">Plain text</option>
                  <option value="md">Markdown</option>
                </Select>
                <Button
                  size="sm"
                  disabled={!pasteDraft.trim()}
                  onClick={addPaste}
                >
                  Add source
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-xs">File{allowMultiple ? '(s)' : ''}</Label>
              <Input
                type="file"
                multiple={allowMultiple}
                accept={accept}
                onChange={(e) => addFiles(e.target.files)}
              />
              {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
            </div>
          )}

          {sources.length > 0 ? (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-medium">
                Queued sources · {sources.length}
              </p>
              <div
                className={cn(
                  'grid gap-2',
                  allowMultiple ? 'grid-cols-2' : 'grid-cols-1',
                )}
              >
                {sources.map((src) => (
                  <SourceTile key={src.id} src={src} onRemove={() => removeSource(src.id)} />
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {/* MIDDLE — target + modes + action */}
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <div>
            <h2 className="mb-2 text-sm font-semibold">2 · Target market</h2>
            <MarketPicker
              value={target}
              onChange={setTarget}
              helper="Pick the parent market first, then narrow to a sub-market if applicable."
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold">3 · Localization modes</h2>
            <p className="text-[11px] text-muted-foreground">
              Combine any of the three.
            </p>
            <div className="mt-2 space-y-1 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={modes.language}
                  onChange={(e) =>
                    setModes({ ...modes, language: e.target.checked })
                  }
                />
                Language (translate / transcreate copy)
              </label>
              <label
                className={cn(
                  'flex items-center gap-2',
                  mediaType === 'text' && 'text-muted-foreground',
                )}
              >
                <input
                  type="checkbox"
                  checked={modes.compliance}
                  disabled={mediaType === 'text'}
                  onChange={(e) =>
                    setModes({ ...modes, compliance: e.target.checked })
                  }
                />
                Compliance (market overlays + rule check)
              </label>
              <label
                className={cn(
                  'flex items-center gap-2',
                  mediaType === 'text' && 'text-muted-foreground',
                )}
              >
                <input
                  type="checkbox"
                  checked={modes.element_replace}
                  disabled={mediaType === 'text'}
                  onChange={(e) =>
                    setModes({ ...modes, element_replace: e.target.checked })
                  }
                />
                Replace elements (Nano Banana / Veo)
              </label>
            </div>
          </div>

          <div className="pt-2">
            <h2 className="text-sm font-semibold">4 · Localize</h2>
            {runAll.isError ? (
              <p className="mt-1 text-xs text-destructive">
                {runAll.error instanceof Error
                  ? runAll.error.message
                  : String(runAll.error)}
              </p>
            ) : null}
            <Button
              className="mt-2 w-full"
              disabled={!canRun}
              onClick={() => runAll.mutate()}
            >
              {runAll.isPending
                ? 'Running…'
                : `Localize ${sources.length || ''} source${sources.length === 1 ? '' : 's'}`}
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {sources.length === 0
                ? 'Add at least one source.'
                : !target.parent
                  ? 'Pick a target market.'
                  : !(modes.language || modes.compliance || modes.element_replace)
                    ? 'Pick at least one mode.'
                    : 'Ready.'}
            </p>
          </div>
        </section>

        {/* RIGHT — per-source result columns */}
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">5 · Results</h2>
          {sources.filter((s) => s.jobId).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Outputs will appear here after you click Localize.
            </p>
          ) : (
            <div className="space-y-3">
              {sources
                .filter((s) => s.jobId)
                .map((s) => (
                  <ResultBlock key={s.id} source={s} />
                ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SourceTile({ src, onRemove }: { src: Source; onRemove: () => void }) {
  return (
    <div className="overflow-hidden rounded-md border bg-background">
      {src.kind === 'file' ? (
        <FilePreview file={src.file} url={src.previewUrl} />
      ) : (
        <div className="max-h-40 overflow-auto whitespace-pre-wrap p-2 text-xs">
          {src.content.slice(0, 600)}
          {src.content.length > 600 ? '…' : ''}
        </div>
      )}
      <div className="flex items-center justify-between border-t px-2 py-1 text-[11px]">
        <span className="truncate font-mono">
          {src.kind === 'file' ? src.file.name : `[${src.format}] pasted`}
        </span>
        {src.jobId ? (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800">
            submitted
          </span>
        ) : (
          <button
            type="button"
            onClick={onRemove}
            className="text-destructive hover:underline"
          >
            remove
          </button>
        )}
      </div>
    </div>
  );
}

function FilePreview({ file, url }: { file: File; url: string | null }) {
  if (!url) {
    return (
      <div className="p-2 text-[11px] text-muted-foreground">
        {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
      </div>
    );
  }
  if (file.type.startsWith('image/')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={file.name} className="h-28 w-full object-contain bg-muted/30" />;
  }
  if (file.type.startsWith('video/')) {
    return <video src={url} className="h-28 w-full object-contain bg-black" controls />;
  }
  return null;
}

function ResultBlock({
  source,
}: {
  source: Extract<Source, { jobId: string }>;
}) {
  const localized = useQuery({
    queryKey: ['job-localized', source.jobId],
    queryFn: () => listLocalized(source.jobId!),
    enabled: !!source.jobId,
    refetchInterval: (q) => {
      const rows = q.state.data as LocalizedAssetSummary[] | undefined;
      if (!rows || rows.length === 0) return 2500;
      const pending = rows.some(
        (r) => r.status === 'draft' || r.status === 'compliance_checking',
      );
      return pending ? 2500 : false;
    },
  });

  const label =
    source.kind === 'file' ? source.file.name : `[${source.format}] pasted source`;

  return (
    <div className="rounded-md border bg-background p-2">
      <p className="truncate font-mono text-[11px]" title={label}>
        {label}
      </p>
      {localized.isLoading ? (
        <p className="text-xs text-muted-foreground">Running…</p>
      ) : (localized.data ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">Waiting for worker…</p>
      ) : (
        <div className="mt-1 space-y-1">
          {localized.data!.map((a) => (
            <Link
              key={a.id}
              href={`/localized/${a.id}` as never}
              className="block rounded border px-2 py-1 text-xs transition-colors hover:bg-accent/40"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold">
                  {a.target_sub_market ?? a.target_market}
                </span>
                <span
                  className={cn(
                    'rounded px-2 py-0.5 text-[10px] uppercase',
                    STATUS_BADGE[a.status],
                  )}
                >
                  {a.status.replace('_', ' ')}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Overlay {a.compliance_overlay_applied ? '✓' : '—'} · review →
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
