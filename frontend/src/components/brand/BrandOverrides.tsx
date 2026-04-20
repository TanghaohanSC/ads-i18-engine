'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listRules, type ComplianceRule } from '@/lib/rules';
import {
  createOverride,
  deactivateOverride,
  listOverrides,
  type BrandOverride,
  type OverrideType,
} from '@/lib/overrides';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/cn';

const OVERRIDE_HINT: Record<OverrideType, string> = {
  add: 'Add a brand-specific rule on top of the defaults.',
  tighten: 'Raise severity / narrow conditions of a system rule.',
  relax: 'Lower severity / widen conditions of a system rule.',
  disable: 'Turn off a system rule for this brand only (logged).',
};

export function BrandOverrides({ brandId }: { brandId: string }) {
  const qc = useQueryClient();
  const rules = useQuery({ queryKey: ['rules'], queryFn: () => listRules() });
  const overrides = useQuery({
    queryKey: ['overrides', brandId],
    queryFn: () => listOverrides(brandId),
  });

  const active = useMemo(
    () => (overrides.data ?? []).filter((o) => o.is_active),
    [overrides.data],
  );
  const overrideByRuleId = useMemo(() => {
    const m = new Map<string, BrandOverride>();
    for (const o of active) if (o.system_rule_id) m.set(o.system_rule_id, o);
    return m;
  }, [active]);

  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [overrideType, setOverrideType] = useState<OverrideType>('tighten');
  const [changeReason, setChangeReason] = useState<string>('');
  const [newSeverity, setNewSeverity] = useState<string>('');
  const [messageOverride, setMessageOverride] = useState<string>('');
  const [reasonRequired, setReasonRequired] = useState<string>('');

  const create = useMutation({
    mutationFn: () => {
      const mods: Record<string, unknown> = {};
      if (newSeverity) mods.severity = newSeverity;
      if (messageOverride) mods.message_override = messageOverride;
      if (reasonRequired) mods.reason_required_override = reasonRequired === 'true';
      return createOverride(brandId, {
        system_rule_id: selectedRuleId,
        override_type: overrideType,
        modifications: mods,
        change_reason: changeReason,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['overrides', brandId] });
      setSelectedRuleId('');
      setChangeReason('');
      setNewSeverity('');
      setMessageOverride('');
      setReasonRequired('');
    },
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => deactivateOverride(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['overrides', brandId] }),
  });

  const selectedRule = useMemo(
    () => (rules.data ?? []).find((r) => r.id === selectedRuleId),
    [rules.data, selectedRuleId],
  );
  const canCreate =
    !!selectedRuleId && changeReason.trim().length >= 10 && !create.isPending;

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <div>
          <h3 className="text-sm font-semibold">Create override</h3>
          <p className="text-xs text-muted-foreground">
            {OVERRIDE_HINT[overrideType]}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">System rule</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border bg-transparent px-2 text-sm"
              value={selectedRuleId}
              onChange={(e) => setSelectedRuleId(e.target.value)}
            >
              <option value="">— select rule —</option>
              {(rules.data ?? []).map((r: ComplianceRule) => (
                <option key={r.id} value={r.id} disabled={overrideByRuleId.has(r.id)}>
                  [{r.market}] {r.code} · {r.title}
                  {overrideByRuleId.has(r.id) ? ' (already overridden)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">Override type</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border bg-transparent px-2 text-sm"
              value={overrideType}
              onChange={(e) => setOverrideType(e.target.value as OverrideType)}
            >
              <option value="tighten">tighten</option>
              <option value="relax">relax</option>
              <option value="disable">disable</option>
              <option value="add">add (brand-specific new rule)</option>
            </select>
          </div>

          {overrideType === 'tighten' || overrideType === 'relax' ? (
            <>
              <div>
                <Label className="text-xs">New severity (optional)</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value)}
                >
                  <option value="">keep original</option>
                  <option value="critical">critical</option>
                  <option value="warning">warning</option>
                  <option value="info">info</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Reason-required override (optional)</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                  value={reasonRequired}
                  onChange={(e) => setReasonRequired(e.target.value)}
                >
                  <option value="">keep original</option>
                  <option value="true">require reason on ack</option>
                  <option value="false">no reason required</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Message override (optional)</Label>
                <textarea
                  className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                  rows={2}
                  value={messageOverride}
                  onChange={(e) => setMessageOverride(e.target.value)}
                  placeholder="Custom message displayed when this rule triggers"
                />
              </div>
            </>
          ) : null}

          <div className="md:col-span-2">
            <Label className="text-xs">Change reason (required, min 10 chars)</Label>
            <textarea
              className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              rows={2}
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="Why is this change being made? Logged for system admin observability."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {changeReason.trim().length} / 10
            </p>
          </div>
        </div>

        {selectedRule ? (
          <div className="rounded-md bg-muted/40 p-2 text-xs">
            Selected: <span className="font-mono">{selectedRule.code}</span> —{' '}
            {selectedRule.title}
            <br />
            Currently{' '}
            <span className="rounded bg-slate-200 px-1">
              {selectedRule.severity}
            </span>{' '}
            in market <span className="font-mono">{selectedRule.market}</span>
          </div>
        ) : null}

        {create.isError ? (
          <p className="text-xs text-destructive">
            {create.error instanceof Error
              ? create.error.message
              : String(create.error)}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button disabled={!canCreate} onClick={() => create.mutate()}>
            {create.isPending ? 'Creating…' : 'Create override'}
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Active overrides</h3>
        {overrides.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No overrides — this brand uses default system rules.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Rule</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Modifications</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {active.map((o) => {
                  const rule = (rules.data ?? []).find(
                    (r) => r.id === o.system_rule_id,
                  );
                  return (
                    <tr key={o.id} className="border-t align-top">
                      <td className="px-3 py-2 font-mono text-xs">
                        {rule ? `${rule.market} · ${rule.code}` : o.system_rule_id ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'rounded px-2 py-0.5 text-[10px] uppercase',
                            o.override_type === 'tighten'
                              ? 'bg-red-100 text-red-900'
                              : o.override_type === 'relax'
                                ? 'bg-amber-100 text-amber-900'
                                : o.override_type === 'disable'
                                  ? 'bg-slate-200 text-slate-900'
                                  : 'bg-violet-100 text-violet-900',
                          )}
                        >
                          {o.override_type}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {Object.keys(o.modifications ?? {}).length > 0
                          ? JSON.stringify(o.modifications)
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground max-w-[240px]">
                        {o.change_reason}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deactivate.mutate(o.id)}
                          disabled={deactivate.isPending}
                        >
                          Deactivate
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
