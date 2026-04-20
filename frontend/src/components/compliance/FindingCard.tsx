'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { Finding } from '@/lib/compliance';
import { Button } from '@/components/ui/button';

const SEVERITY_STYLES: Record<Finding['severity'], string> = {
  critical: 'border-red-500 bg-red-50 text-red-950',
  warning: 'border-amber-500 bg-amber-50 text-amber-950',
  info: 'border-blue-400 bg-blue-50 text-blue-950',
};

const SEVERITY_LABEL: Record<Finding['severity'], string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
};

export type AckState = {
  acknowledged: boolean;
  reason: string;
};

export function FindingCard({
  finding,
  state,
  onChange,
  minReasonLength = 30,
}: {
  finding: Finding;
  state: AckState;
  onChange: (next: AckState) => void;
  minReasonLength?: number;
}) {
  const [open, setOpen] = useState(finding.severity === 'critical');
  const reasonMissing =
    finding.reason_required && state.reason.trim().length < minReasonLength;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border-l-4 bg-card text-sm shadow-sm',
        SEVERITY_STYLES[finding.severity],
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-card px-2 py-0.5 text-xs font-semibold">
              {SEVERITY_LABEL[finding.severity]}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {finding.rule_code}
            </span>
            {finding.deferred ? (
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                vision/audio check pending
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-medium">{finding.message}</p>
          {finding.detected_content ? (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              detected: {finding.detected_content}
            </p>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">{open ? '▲' : '▼'}</span>
      </button>

      {open ? (
        <div className="space-y-3 border-t px-4 py-3">
          {finding.suggested_fix ? (
            <p className="text-xs text-muted-foreground">
              Suggested fix: {finding.suggested_fix}
            </p>
          ) : null}
          {finding.regulation_reference ? (
            <p className="text-xs text-muted-foreground">
              Reference: {finding.regulation_reference}
            </p>
          ) : null}

          {finding.reason_required ? (
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Reason for proceeding (required, min {minReasonLength} chars)
              </label>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                rows={3}
                value={state.reason}
                onChange={(e) =>
                  onChange({ ...state, reason: e.target.value })
                }
                placeholder="Explain why it's appropriate to proceed with this finding unresolved…"
              />
              <p className="text-xs text-muted-foreground">
                {state.reason.trim().length}/{minReasonLength}
              </p>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Finding applies to{' '}
              {finding.trigger_location
                ? JSON.stringify(finding.trigger_location)
                : '—'}
            </span>
            <Button
              size="sm"
              variant={state.acknowledged ? 'secondary' : 'default'}
              disabled={reasonMissing}
              onClick={() =>
                onChange({ ...state, acknowledged: !state.acknowledged })
              }
            >
              {state.acknowledged ? 'Acknowledged ✓' : 'Acknowledge'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
