'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';

import { createJob, type MarketCode } from '@/lib/jobs';
import { getParsed } from '@/lib/assets';
import { listSubMarkets, type SubMarket } from '@/lib/sub_markets';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const DEFAULT_TARGETS: Array<{ market: MarketCode; sub_market?: string }> = [
  { market: 'US', sub_market: 'US-NJ' },
  { market: 'UK', sub_market: 'UK-GB' },
  { market: 'DE' },
  { market: 'FR' },
  { market: 'BR' },
  { market: 'PH' },
  { market: 'IN' },
  { market: 'NG', sub_market: 'NG-LA' },
];

export default function NewJobPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const router = useRouter();
  const [selected, setSelected] = useState<
    Array<{ market: MarketCode; sub_market?: string }>
  >(DEFAULT_TARGETS);

  const parsed = useQuery({
    queryKey: ['parsed', assetId],
    queryFn: () => getParsed(assetId),
  });
  const subs = useQuery({
    queryKey: ['sub-markets'],
    queryFn: () => listSubMarkets(),
  });

  const active = useMemo(
    () =>
      (subs.data ?? []).filter((s) => s.operational_status === 'active'),
    [subs.data],
  );

  function toggle(tag: string) {
    const sm = (subs.data ?? []).find((s) => s.id === tag);
    if (!sm) return;
    const idx = selected.findIndex(
      (t) => (t.sub_market ?? t.market) === tag,
    );
    if (idx >= 0) {
      setSelected(selected.filter((_, i) => i !== idx));
    } else {
      setSelected([
        ...selected,
        {
          market: sm.parent_market,
          sub_market: sm.id === sm.parent_market ? undefined : sm.id,
        },
      ]);
    }
  }

  const create = useMutation({
    mutationFn: () =>
      createJob({ source_asset_id: assetId, targets: selected }),
    onSuccess: (job) => router.push(`/jobs/${job.id}`),
  });

  const luSummary = useMemo(() => {
    const items = parsed.data?.localizable_units ?? [];
    const by: Record<string, number> = {};
    items.forEach((l) => {
      by[l.lu_type] = (by[l.lu_type] ?? 0) + 1;
    });
    return by;
  }, [parsed.data]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">New Localization Job</h1>
        <p className="font-mono text-xs text-muted-foreground">asset: {assetId}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parse summary</CardTitle>
          <CardDescription>
            {parsed.data?.parse_method ?? 'pending'} ·{' '}
            {parsed.data?.parse_model_used ?? '—'} · warnings{' '}
            {parsed.data?.parse_warnings?.length ?? 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {parsed.data ? (
              <>
                Detected LUs:{' '}
                {Object.entries(luSummary).map(([k, v]) => (
                  <span key={k} className="mr-3 font-mono text-xs">
                    {k}: {v}
                  </span>
                ))}
              </>
            ) : (
              'Loading…'
            )}
          </p>
          {parsed.data?.parse_warnings?.length ? (
            <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
              {parsed.data.parse_warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target markets / sub-markets</CardTitle>
          <CardDescription>
            Toggle sub-markets to include. Blocked states are hidden (they are
            still used as distribution-metadata exclusions by the orchestrator).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-1 md:grid-cols-4">
            {active.map((sm) => {
              const tag = sm.id;
              const checked = selected.some(
                (t) => (t.sub_market ?? t.market) === tag,
              );
              return (
                <label
                  key={tag}
                  className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(tag)}
                  />
                  <span className="font-mono text-xs">{tag}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {sm.display_name}
                  </span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
        <Button
          disabled={selected.length === 0 || create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending
            ? 'Creating…'
            : `Create job (${selected.length} target${
                selected.length === 1 ? '' : 's'
              })`}
        </Button>
      </div>
    </div>
  );
}
