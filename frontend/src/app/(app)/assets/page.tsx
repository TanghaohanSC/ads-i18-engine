'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { api } from '@/lib/api';
import { listAssets, type SourceAsset } from '@/lib/assets';
import { listProjects } from '@/lib/projects';
import { UploadForm } from '@/components/upload/UploadForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type Brand = { id: string; name: string };

const STATUS_STYLE: Record<SourceAsset['parse_status'], string> = {
  pending: 'bg-slate-100 text-slate-700',
  parsing: 'bg-amber-100 text-amber-800',
  parsed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
};

export default function AssetsPage() {
  const t = useTranslations('Assets');
  const [brandId, setBrandId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');

  const brands = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: () => api<Brand[]>('/v1/brands'),
  });

  const projects = useQuery({
    queryKey: ['projects', brandId],
    queryFn: () => listProjects(brandId),
    enabled: !!brandId,
  });

  const assets = useQuery({
    queryKey: ['assets', projectId],
    queryFn: () => listAssets(projectId),
    enabled: !!projectId,
    refetchInterval: (q) =>
      (q.state.data ?? []).some(
        (a: SourceAsset) =>
          a.parse_status === 'pending' || a.parse_status === 'parsing',
      )
        ? 4000
        : false,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload source asset</CardTitle>
          <CardDescription>
            PSD with editable layers is preferred. Flat PNG/JPG + MP4 are accepted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadForm
            onUploaded={() => {
              if (projectId) assets.refetch();
            }}
          />
        </CardContent>
      </Card>

      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <label className="text-xs">Brand filter</label>
          <select
            className="mt-1 h-9 w-full rounded-md border bg-transparent px-2 text-sm"
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
              setProjectId('');
            }}
          >
            <option value="">— all (pick a brand) —</option>
            {(brands.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs">Project filter</label>
          <select
            className="mt-1 h-9 w-full rounded-md border bg-transparent px-2 text-sm"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={!brandId}
          >
            <option value="">— select project —</option>
            {(projects.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assets</CardTitle>
          <CardDescription>
            Once a source asset is parsed, start a localization job from its row.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!projectId ? (
            <p className="text-sm text-muted-foreground">
              Select a project to list its assets.
            </p>
          ) : assets.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (assets.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No assets yet. Upload one above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">File</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Size</th>
                    <th className="py-2 pr-4">Layers?</th>
                    <th className="py-2 pr-4">Parse</th>
                    <th className="py-2 pr-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.data!.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="py-2 pr-4">{a.original_filename}</td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {a.source_type}
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {(a.size_bytes / 1024 / 1024).toFixed(1)} MB
                      </td>
                      <td className="py-2 pr-4">
                        {a.has_editable_layers ? 'yes' : 'no'}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            STATUS_STYLE[a.parse_status]
                          }`}
                        >
                          {a.parse_status}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        {a.parse_status === 'parsed' ? (
                          <Link
                            className="text-xs underline underline-offset-2"
                            href={`/new-job/${a.id}` as never}
                          >
                            New job →
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            waiting for parse
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
