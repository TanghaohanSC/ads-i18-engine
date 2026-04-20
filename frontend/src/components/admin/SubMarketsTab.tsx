'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

type SubMarket = {
  id: string;
  parent_market: string;
  handler: string;
  display_name: string;
  region_code: string | null;
  operational_status:
    | 'active'
    | 'blocked'
    | 'limited'
    | 'volatile'
    | 'inactive'
    | 'tribal_only';
  regulatory_body: string | null;
  law_reference: string | null;
  min_age: number | null;
  currency: string | null;
  content_language: string | null;
  last_reviewed_at: string | null;
};

const STATUS_STYLE: Record<SubMarket['operational_status'], string> = {
  active: 'bg-green-100 text-green-800',
  blocked: 'bg-red-100 text-red-800',
  limited: 'bg-amber-100 text-amber-800',
  volatile: 'bg-amber-100 text-amber-800',
  inactive: 'bg-slate-100 text-slate-700',
  tribal_only: 'bg-slate-100 text-slate-700',
};

const MARKET_ORDER: Record<string, number> = {
  US: 1, UK: 2, DE: 3, FR: 4, BR: 5, IN: 6, PH: 7, NG: 8,
};

const MARKET_DISPLAY: Record<string, { name: string; accent: string }> = {
  US: { name: 'United States', accent: 'bg-blue-100 text-blue-900 ring-blue-300' },
  UK: { name: 'United Kingdom', accent: 'bg-indigo-100 text-indigo-900 ring-indigo-300' },
  DE: { name: 'Germany', accent: 'bg-amber-100 text-amber-900 ring-amber-300' },
  FR: { name: 'France', accent: 'bg-sky-100 text-sky-900 ring-sky-300' },
  BR: { name: 'Brazil', accent: 'bg-emerald-100 text-emerald-900 ring-emerald-300' },
  IN: { name: 'India', accent: 'bg-orange-100 text-orange-900 ring-orange-300' },
  PH: { name: 'Philippines', accent: 'bg-rose-100 text-rose-900 ring-rose-300' },
  NG: { name: 'Nigeria', accent: 'bg-green-100 text-green-900 ring-green-300' },
};

const HANDLER_LABEL: Record<string, string> = {
  per_state_operating: 'Per-state (each sub-market independent)',
  blocklist: 'Blocklist (one asset + state geo-fence)',
  optional_dual: 'Optional dual (opt-in second sub-market)',
  federal_only: 'Federal (single market)',
  federal_placeholder: 'Federal (state expansion reserved)',
};

export function SubMarketsTab() {
  const subMarkets = useQuery({
    queryKey: ['sub-markets'],
    queryFn: () => api<SubMarket[]>('/v1/sub-markets'),
  });

  const grouped = useMemo(() => {
    const data = subMarkets.data ?? [];
    const map: Record<string, SubMarket[]> = {};
    for (const sm of data) (map[sm.parent_market] ??= []).push(sm);
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => {
        const aa = a.operational_status === 'active' ? 0 : 1;
        const bb = b.operational_status === 'active' ? 0 : 1;
        if (aa !== bb) return aa - bb;
        return (a.region_code ?? a.id).localeCompare(b.region_code ?? b.id);
      });
    }
    return map;
  }, [subMarkets.data]);

  const orderedMarkets = useMemo(
    () =>
      Object.keys(grouped).sort(
        (a, b) => (MARKET_ORDER[a] ?? 99) - (MARKET_ORDER[b] ?? 99),
      ),
    [grouped],
  );

  if (subMarkets.isLoading)
    return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-3">
      {orderedMarkets.map((m) => (
        <MarketGroup key={m} market={m} subMarkets={grouped[m]} />
      ))}
    </div>
  );
}

function MarketGroup({
  market,
  subMarkets,
}: {
  market: string;
  subMarkets: SubMarket[];
}) {
  const meta = MARKET_DISPLAY[market] ?? {
    name: market,
    accent: 'bg-slate-100 text-slate-900 ring-slate-300',
  };
  const handler = subMarkets[0]?.handler ?? 'federal_only';
  const counts = subMarkets.reduce<Record<string, number>>((acc, sm) => {
    acc[sm.operational_status] = (acc[sm.operational_status] ?? 0) + 1;
    return acc;
  }, {});
  const isFederalSingle =
    handler === 'federal_only' || handler === 'federal_placeholder';
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent/40"
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-md font-mono text-sm font-semibold ring-1',
              meta.accent,
            )}
          >
            {market}
          </span>
          <div>
            <div className="text-sm font-semibold">{meta.name}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {HANDLER_LABEL[handler] ?? handler}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {!isFederalSingle && (
            <>
              {counts.active ? (
                <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">
                  active {counts.active}
                </span>
              ) : null}
              {counts.blocked ? (
                <span className="rounded bg-red-100 px-2 py-0.5 text-red-800">
                  blocked {counts.blocked}
                </span>
              ) : null}
              {counts.limited ? (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">
                  limited {counts.limited}
                </span>
              ) : null}
              {counts.inactive ? (
                <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">
                  placeholder {counts.inactive}
                </span>
              ) : null}
            </>
          )}
          <span className="text-muted-foreground">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open ? (
        isFederalSingle && subMarkets.length === 1 ? (
          <FederalSummary sm={subMarkets[0]} />
        ) : (
          <SubMarketTable subMarkets={subMarkets} />
        )
      ) : null}
    </div>
  );
}

function FederalSummary({ sm }: { sm: SubMarket }) {
  return (
    <div className="grid gap-3 border-t p-4 text-sm md:grid-cols-4">
      <Field label="Regulator" value={sm.regulatory_body} />
      <Field label="Law" value={sm.law_reference} />
      <Field label="Min age" value={sm.min_age !== null ? `${sm.min_age}+` : null} />
      <Field label="Currency" value={sm.currency} />
      <Field label="Language" value={sm.content_language} />
      <Field label="Reviewed" value={sm.last_reviewed_at} />
      <div className="md:col-span-2">
        <p className="text-xs text-muted-foreground">Status</p>
        <span className={cn('mt-1 inline-block rounded px-2 py-0.5 text-xs', STATUS_STYLE[sm.operational_status])}>
          {sm.operational_status}
        </span>
      </div>
    </div>
  );
}

function SubMarketTable({ subMarkets }: { subMarkets: SubMarket[] }) {
  return (
    <div className="overflow-x-auto border-t">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2">ID</th>
            <th className="px-3 py-2">Region</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Regulator</th>
            <th className="px-3 py-2">Age</th>
            <th className="px-3 py-2">Ccy</th>
            <th className="px-3 py-2">Reviewed</th>
          </tr>
        </thead>
        <tbody>
          {subMarkets.map((sm) => (
            <tr key={sm.id} className="border-t last:border-b-0">
              <td className="px-4 py-1.5 font-mono text-xs">{sm.id}</td>
              <td className="px-3 py-1.5 font-mono text-xs">{sm.region_code ?? '—'}</td>
              <td className="px-3 py-1.5">{sm.display_name}</td>
              <td className="px-3 py-1.5">
                <span className={cn('rounded px-2 py-0.5 text-[10px] uppercase', STATUS_STYLE[sm.operational_status])}>
                  {sm.operational_status}
                </span>
              </td>
              <td className="px-3 py-1.5 text-xs text-muted-foreground">{sm.regulatory_body ?? '—'}</td>
              <td className="px-3 py-1.5">{sm.min_age ?? '—'}</td>
              <td className="px-3 py-1.5">{sm.currency ?? '—'}</td>
              <td className="px-3 py-1.5 text-xs text-muted-foreground">{sm.last_reviewed_at ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm" title={value ?? ''}>
        {value ?? '—'}
      </p>
    </div>
  );
}
