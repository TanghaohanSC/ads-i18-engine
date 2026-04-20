'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';

import {
  runCheck,
  confirmAsset,
  type CheckResult,
  type Finding,
} from '@/lib/compliance';
import { FindingCard, type AckState } from '@/components/compliance/FindingCard';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function LocalizedReviewPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const router = useRouter();
  const [acks, setAcks] = useState<Record<string, AckState>>({});
  const [confirmed, setConfirmed] = useState<boolean>(false);

  const check = useQuery<CheckResult>({
    queryKey: ['check', assetId],
    queryFn: () => runCheck(assetId),
  });

  const confirm = useMutation({
    mutationFn: () =>
      confirmAsset(assetId, {
        acknowledgments: (check.data?.findings ?? [])
          .filter((f) => acks[f.rule_id]?.acknowledged)
          .map((f) => ({
            rule_id: f.rule_id,
            rule_version: f.rule_version,
            severity: f.severity,
            reason_provided: acks[f.rule_id]?.reason,
          })),
      }),
    onSuccess: () => setConfirmed(true),
  });

  const summary = useMemo(() => {
    const f = check.data?.findings ?? [];
    return {
      total: f.length,
      critical: f.filter((x) => x.severity === 'critical').length,
      warning: f.filter((x) => x.severity === 'warning').length,
      info: f.filter((x) => x.severity === 'info').length,
    };
  }, [check.data]);

  const readyToConfirm = useMemo(() => {
    const findings = check.data?.findings ?? [];
    for (const f of findings) {
      if (f.severity === 'critical' && !acks[f.rule_id]?.acknowledged) return false;
      if (f.reason_required) {
        const r = acks[f.rule_id]?.reason?.trim() ?? '';
        if (r.length < 30) return false;
      }
    }
    return true;
  }, [acks, check.data]);

  if (confirmed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset confirmed</CardTitle>
          <CardDescription>
            An immutable AssetConfirmation record has been written. The asset is queued for distribution.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={() => router.push('/workflow')}>Back to workflow</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Compliance Review</h1>
          <p className="font-mono text-xs text-muted-foreground">{assetId}</p>
          {check.data ? (
            <p className="text-sm text-muted-foreground">
              {check.data.market}
              {check.data.sub_market ? ` / ${check.data.sub_market}` : ''}{' '}
              · {check.data.effective_rule_count} effective rules ·{' '}
              {check.data.overall_status}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          <Button
            disabled={!readyToConfirm || confirm.isPending || check.isLoading}
            onClick={() => confirm.mutate()}
          >
            {confirm.isPending
              ? 'Confirming…'
              : summary.total === 0
                ? 'Confirm and distribute'
                : 'Confirm all and distribute'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>
            All findings are advisory — the system never blocks submission. Ad
            Ops owns the final decision. Critical findings must be
            acknowledged; reason-required findings need a written explanation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Critical</span>
            <span className="ml-2 font-semibold text-red-700">{summary.critical}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Warning</span>
            <span className="ml-2 font-semibold text-amber-700">{summary.warning}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Info</span>
            <span className="ml-2 font-semibold text-blue-700">{summary.info}</span>
          </div>
        </CardContent>
      </Card>

      {check.isLoading ? (
        <p className="text-sm text-muted-foreground">Running compliance check…</p>
      ) : check.isError ? (
        <p className="text-sm text-destructive">
          {check.error instanceof Error ? check.error.message : 'Check failed'}
        </p>
      ) : summary.total === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm">
            ✓ All compliance checks passed. Please review the final output and
            confirm this asset is ready for distribution.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(check.data?.findings ?? []).map((f: Finding) => (
            <FindingCard
              key={`${f.rule_id}-${f.detected_content ?? ''}`}
              finding={f}
              state={acks[f.rule_id] ?? { acknowledged: false, reason: '' }}
              onChange={(next) =>
                setAcks((prev) => ({ ...prev, [f.rule_id]: next }))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
