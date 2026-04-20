'use client';

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getMatrix, patchCell, type MatrixView } from '@/lib/jobs';
import { StrategyCell } from './StrategyCell';
import { Button } from '@/components/ui/button';

function roleBadge(role: string | null): string {
  return role ?? '—';
}

export function StrategyMatrix({ jobId }: { jobId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery<MatrixView>({
    queryKey: ['matrix', jobId],
    queryFn: () => getMatrix(jobId),
  });

  const rows = data?.rows ?? [];
  const targets = useMemo(() => data?.targets ?? [], [data]);

  async function setCell(
    lu_id: string,
    target: string,
    strategy: string,
  ) {
    const next = await patchCell(jobId, { lu_id, target, strategy });
    qc.setQueryData(['matrix', jobId], next);
  }

  async function setCellContent(
    lu_id: string,
    target: string,
    strategy: string,
    payload: { user_provided_content?: string; user_instructions?: string },
  ) {
    const next = await patchCell(jobId, {
      lu_id,
      target,
      strategy,
      ...payload,
    });
    qc.setQueryData(['matrix', jobId], next);
  }

  async function applyRowAll(lu_id: string, strategy: string) {
    // optimistic sequential patch — in Phase 3 we'll add a bulk endpoint.
    let latest: MatrixView | undefined;
    for (const t of targets) {
      latest = await patchCell(jobId, { lu_id, target: t, strategy });
    }
    if (latest) qc.setQueryData(['matrix', jobId], latest);
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading matrix…</p>;
  if (isError)
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : 'Failed to load'}
      </p>
    );
  if (!rows.length)
    return <p className="text-sm text-muted-foreground">No LUs parsed for this asset.</p>;

  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Unit</th>
            <th className="px-3 py-2 text-left">Role</th>
            <th className="px-3 py-2 text-left">Preview</th>
            {targets.map((t) => (
              <th key={t} className="px-2 py-2 text-center font-mono">
                {t}
              </th>
            ))}
            <th className="px-3 py-2 text-left">Batch</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.lu_id} className="border-t align-top">
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {row.lu_type}
              </td>
              <td className="px-3 py-2 text-xs">{roleBadge(row.semantic_role)}</td>
              <td className="max-w-[260px] px-3 py-2">
                <p className="truncate" title={row.preview}>
                  {row.preview || <span className="text-muted-foreground">—</span>}
                </p>
                {row.parser_confidence !== null ? (
                  <p className="text-[10px] text-muted-foreground">
                    confidence {(row.parser_confidence * 100).toFixed(0)}%
                  </p>
                ) : null}
              </td>
              {targets.map((t) => {
                const cell = row.cells[t];
                return (
                  <td key={t} className="px-2 py-2 text-center">
                    {cell ? (
                      <StrategyCell
                        luType={row.lu_type}
                        value={cell}
                        disabled={row.is_locked}
                        onChange={(next) => setCell(row.lu_id, t, next)}
                        onContentChange={(payload) =>
                          setCellContent(row.lu_id, t, cell.strategy, payload)
                        }
                      />
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                );
              })}
              <td className="px-3 py-2">
                <BatchRowApply
                  luType={row.lu_type}
                  onApply={(s) => applyRowAll(row.lu_id, s)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BatchRowApply({
  luType,
  onApply,
}: {
  luType: 'text' | 'visual' | 'audio';
  onApply: (strategy: string) => void;
}) {
  // three top-choice quick buttons — full menu is in the per-cell dropdown.
  const preset =
    luType === 'text'
      ? (['literal_translate', 'transcreate', 'keep_original'] as const)
      : luType === 'visual'
        ? (['keep_original', 'localize_culturally', 'replace_for_compliance'] as const)
        : (['add_subtitles_only', 'replace_dialogue', 'keep_original'] as const);
  return (
    <div className="flex gap-1">
      {preset.map((s) => (
        <Button
          key={s}
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[10px]"
          onClick={() => onApply(s)}
          title={`Apply ${s} to all markets`}
        >
          {s.split('_')[0]}
        </Button>
      ))}
    </div>
  );
}
