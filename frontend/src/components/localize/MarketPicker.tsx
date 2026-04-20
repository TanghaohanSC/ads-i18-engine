'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { listSubMarkets, type SubMarket } from '@/lib/sub_markets';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export type MarketPickerValue = {
  parent: string; // e.g. "US"
  subMarketId: string | null; // e.g. "US-NJ" — null when parent has no sub-markets
};

const PARENT_ORDER: Record<string, number> = {
  US: 1,
  UK: 2,
  DE: 3,
  FR: 4,
  BR: 5,
  IN: 6,
  PH: 7,
  NG: 8,
};

const PARENT_LABEL: Record<string, string> = {
  US: 'United States',
  UK: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  BR: 'Brazil',
  IN: 'India',
  PH: 'Philippines',
  NG: 'Nigeria',
};

export function MarketPicker({
  value,
  onChange,
  activeOnly = true,
  label = 'Target market',
  helper,
}: {
  value: MarketPickerValue;
  onChange: (next: MarketPickerValue) => void;
  activeOnly?: boolean;
  label?: string;
  helper?: string;
}) {
  const subMarkets = useQuery({
    queryKey: ['sub-markets'],
    queryFn: () => listSubMarkets(),
  });

  const rows = useMemo(() => {
    let rs = subMarkets.data ?? [];
    if (activeOnly) rs = rs.filter((s) => s.operational_status === 'active');
    return rs;
  }, [subMarkets.data, activeOnly]);

  const byParent = useMemo(() => {
    const map: Record<string, SubMarket[]> = {};
    for (const s of rows) {
      if (s.id === s.parent_market) continue; // federal-only has a single row == its parent
      (map[s.parent_market] ??= []).push(s);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.region_code ?? '').localeCompare(b.region_code ?? ''));
    }
    return map;
  }, [rows]);

  const parents = useMemo(() => {
    const set = new Set(rows.map((s) => s.parent_market));
    return Array.from(set).sort(
      (a, b) => (PARENT_ORDER[a] ?? 99) - (PARENT_ORDER[b] ?? 99),
    );
  }, [rows]);

  const children = byParent[value.parent] ?? [];
  const showSecond = children.length > 0;

  function onParentChange(next: string) {
    const subs = byParent[next] ?? [];
    const first = subs[0]?.id ?? null;
    onChange({ parent: next, subMarketId: first });
  }

  function onSubChange(next: string) {
    onChange({ parent: value.parent, subMarketId: next || null });
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="grid gap-2 md:grid-cols-2">
        <Select
          value={value.parent}
          onChange={(e) => onParentChange(e.target.value)}
        >
          <option value="">— select market —</option>
          {parents.map((p) => (
            <option key={p} value={p}>
              {p} · {PARENT_LABEL[p] ?? p}
            </option>
          ))}
        </Select>

        <Select
          value={value.subMarketId ?? ''}
          onChange={(e) => onSubChange(e.target.value)}
          disabled={!showSecond}
        >
          {!showSecond ? (
            <option value="">
              {value.parent ? 'Federal — no sub-markets' : '— pick a market first —'}
            </option>
          ) : (
            children.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.display_name}
              </option>
            ))
          )}
        </Select>
      </div>
      {helper ? (
        <p className="text-[11px] text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}
