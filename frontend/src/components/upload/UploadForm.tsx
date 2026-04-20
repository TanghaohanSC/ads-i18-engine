'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { uploadAsset } from '@/lib/assets';
import { listProjects, createProject } from '@/lib/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Brand = { id: string; name: string; slug: string };

export function UploadForm({ onUploaded }: { onUploaded?: (assetId: string) => void }) {
  const qc = useQueryClient();
  const brands = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: () => api<Brand[]>('/v1/brands'),
  });

  const [brandId, setBrandId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState('');

  const projects = useQuery({
    queryKey: ['projects', brandId],
    queryFn: () => listProjects(brandId),
    enabled: !!brandId,
  });

  const [newProjectName, setNewProjectName] = useState('');
  const makeProject = useMutation({
    mutationFn: () =>
      createProject({ brand_id: brandId, name: newProjectName.trim() }),
    onSuccess: (p) => {
      setProjectId(p.id);
      setNewProjectName('');
      qc.invalidateQueries({ queryKey: ['projects', brandId] });
    },
  });

  const upload = useMutation({
    mutationFn: () => {
      if (!file || !projectId) throw new Error('pick project + file');
      return uploadAsset({ project_id: projectId, file, tags });
    },
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: ['assets', projectId] });
      setFile(null);
      onUploaded?.(a.id);
    },
  });

  return (
    <div className="space-y-3 rounded-md border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs">Brand</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border bg-transparent px-2 text-sm"
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
              setProjectId('');
            }}
          >
            <option value="">— select brand —</option>
            {(brands.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Project</Label>
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
          {brandId ? (
            <div className="mt-1 flex gap-1">
              <Input
                placeholder="New project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!newProjectName.trim() || makeProject.isPending}
                onClick={() => makeProject.mutate()}
              >
                {makeProject.isPending ? '…' : 'Create'}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      <div>
        <Label className="text-xs">Source file (PSD / PNG / JPG / MP4)</Label>
        <Input
          type="file"
          accept=".psd,.ai,.png,.jpg,.jpeg,.mp4"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <div>
        <Label className="text-xs">Tags (comma-separated)</Label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="champions-league, q2-campaign"
        />
      </div>
      {upload.isError ? (
        <p className="text-xs text-destructive">
          {upload.error instanceof Error ? upload.error.message : String(upload.error)}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          onClick={() => upload.mutate()}
          disabled={!file || !projectId || upload.isPending}
        >
          {upload.isPending ? 'Uploading…' : 'Upload'}
        </Button>
      </div>
    </div>
  );
}
