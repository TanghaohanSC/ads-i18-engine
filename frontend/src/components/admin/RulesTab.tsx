'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { listRules, type ComplianceRule } from '@/lib/rules';
import { cn } from '@/lib/cn';

const SEVERITY_STYLE: Record<ComplianceRule['severity'], string> = {
  critical: 'bg-red-100 text-red-900',
  warning: 'bg-amber-100 text-amber-900',
  info: 'bg-blue-100 text-blue-900',
};

const CATEGORY_STYLE: Record<ComplianceRule['category'], string> = {
  forbidden_word: 'bg-rose-50 text-rose-700',
  required_element: 'bg-emerald-50 text-emerald-700',
  visual_restriction: 'bg-violet-50 text-violet-700',
  structural: 'bg-slate-100 text-slate-700',
  platform_policy: 'bg-indigo-50 text-indigo-700',
  scheduling: 'bg-amber-50 text-amber-700',
  audio_restriction: 'bg-fuchsia-50 text-fuchsia-700',
};

export function RulesTab() {
  const rules = useQuery({
    queryKey: ['rules'],
    queryFn: () => listRules(),
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  const byMarket = useMemo(() => {
    const map: Record<string, ComplianceRule[]> = {};
    for (const r of rules.data ?? []) (map[r.market] ??= []).push(r);
    for (const k of Object.keys(map)) map[k].sort((a, b) => a.code.localeCompare(b.code));
    return map;
  }, [rules.data]);

  const markets = useMemo(
    () => Object.keys(byMarket).sort((a, b) => a.localeCompare(b)),
    [byMarket],
  );

  const filtered = useMemo(() => {
    if (!filter.trim()) return markets;
    const q = filter.toLowerCase();
    return markets.filter((m) =>
      m.toLowerCase().includes(q) ||
      (byMarket[m] ?? []).some(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.message.toLowerCase().includes(q),
      ),
    );
  }, [byMarket, markets, filter]);

  if (rules.isLoading)
    return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          className="h-9 w-full max-w-sm rounded-md border bg-transparent px-3 text-sm"
          placeholder="Filter by market / code / text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {rules.data?.length ?? 0} system rules · {markets.length} scopes
        </p>
      </div>

      {filtered.map((market) => {
        const ruleList = byMarket[market];
        const isOpen = expanded.has(market);
        return (
          <div key={market} className="rounded-lg border bg-card">
            <button
              type="button"
              onClick={() => {
                const next = new Set(expanded);
                if (isOpen) next.delete(market);
                else next.add(market);
                setExpanded(next);
              }}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/40"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 min-w-[3rem] items-center justify-center rounded-md bg-slate-100 px-2 font-mono text-xs font-semibold">
                  {market}
                </span>
                <span className="text-sm">{ruleList.length} rules</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {isOpen ? '▲' : '▼'}
              </span>
            </button>
            {isOpen ? (
              <div className="divide-y border-t">
                {ruleList.map((r) => (
                  <RuleRow key={r.id} rule={r} />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function RuleRow({ rule }: { rule: ComplianceRule }) {
  const trigger = rule.trigger as {
    type?: string;
    conditions?: Record<string, unknown>;
  };
  const phrases =
    (trigger?.conditions as { phrases?: string[] } | undefined)?.phrases;
  const pattern = (trigger?.conditions as { pattern?: string } | undefined)?.pattern;
  return (
    <div className="space-y-1 px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'rounded px-2 py-0.5 text-[10px] uppercase',
            SEVERITY_STYLE[rule.severity],
          )}
        >
          {rule.severity}
        </span>
        <span
          className={cn(
            'rounded px-2 py-0.5 text-[10px]',
            CATEGORY_STYLE[rule.category],
          )}
        >
          {rule.category}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {rule.code}
        </span>
        {rule.reason_required_by_default ? (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900">
            reason required
          </span>
        ) : null}
      </div>
      <p className="font-medium">{rule.title}</p>
      <p className="text-xs text-muted-foreground">{rule.message}</p>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>Trigger: {trigger?.type ?? '—'}</span>
        {phrases ? <span>phrases: {phrases.join(', ')}</span> : null}
        {pattern ? <span>regex: <code>{pattern}</code></span> : null}
        {rule.regulation_reference ? (
          <span>Ref: {rule.regulation_reference}</span>
        ) : null}
        {rule.suggested_fix ? <span>Fix: {rule.suggested_fix}</span> : null}
      </div>
    </div>
  );
}
