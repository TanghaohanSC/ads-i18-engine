'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';

import {
  getJob,
  listLocalized,
  submitJob,
  type LocalizedAssetSummary,
} from '@/lib/jobs';
import { StrategyMatrix } from '@/components/matrix/StrategyMatrix';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/cn';

const STATUS_BADGE: Record<LocalizedAssetSummary['status'], string> = {
  draft: 'bg-slate-100 text-slate-700',
  compliance_checking: 'bg-amber-100 text-amber-800',
  awaiting_confirmation: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  distributed: 'bg-violet-100 text-violet-800',
};

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();

  const job = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJob(jobId),
    refetchInterval: (q) =>
      q.state.data?.status === 'processing' || q.state.data?.status === 'queued'
        ? 3000
        : false,
  });

  const localized = useQuery({
    queryKey: ['job-localized', jobId],
    queryFn: () => listLocalized(jobId),
    enabled: job.data ? job.data.status !== 'draft' : false,
    refetchInterval: (q) =>
      job.data?.status === 'processing' || job.data?.status === 'queued'
        ? 3000
        : false,
  });

  const submit = useMutation({
    mutationFn: () => submitJob(jobId),
    onSuccess: () => {
      job.refetch();
      localized.refetch();
    },
  });

  const disabled =
    job.data?.status !== 'draft' && job.data?.status !== 'failed';

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Localization Job</h1>
          <p className="font-mono text-xs text-muted-foreground">{jobId}</p>
          {job.data ? (
            <p className="text-sm text-muted-foreground">
              Status: <span className="font-medium">{job.data.status}</span>{' '}
              · Targets: {job.data.target_markets.join(', ')}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          <Button
            onClick={() => submit.mutate()}
            disabled={disabled || submit.isPending}
          >
            {submit.isPending ? 'Submitting…' : 'Submit job'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Strategy Matrix</CardTitle>
          <CardDescription>
            Rows are Localizable Units detected from the source asset. Columns
            are target markets / sub-markets. Click a cell to pick a strategy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StrategyMatrix jobId={jobId} />
        </CardContent>
      </Card>

      {job.data && job.data.status !== 'draft' ? (
        <Card>
          <CardHeader>
            <CardTitle>Per-market Results</CardTitle>
            <CardDescription>
              One LocalizedAsset per target. Click through to review compliance
              findings and confirm for distribution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {localized.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (localized.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Waiting for the worker to produce outputs…
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {localized.data!.map((a) => (
                  <Link
                    key={a.id}
                    href={`/localized/${a.id}` as never}
                    className="group"
                  >
                    <div className="rounded-md border p-3 text-sm transition-colors hover:bg-accent">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs">
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
                      <p className="mt-2 text-xs text-muted-foreground">
                        Overlay applied:{' '}
                        {a.compliance_overlay_applied ? 'yes' : 'no'}
                      </p>
                      {a.platform_metadata &&
                      typeof a.platform_metadata === 'object' &&
                      'allowed_sub_regions' in a.platform_metadata ? (
                        <p className="text-[10px] text-muted-foreground">
                          geo:{' '}
                          {(
                            a.platform_metadata
                              .allowed_sub_regions as string[]
                          ).join(', ')}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs underline-offset-2 group-hover:underline">
                        Review compliance →
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
