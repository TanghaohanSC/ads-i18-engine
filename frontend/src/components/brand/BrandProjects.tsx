'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createProject, listProjects, type Project } from '@/lib/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function BrandProjects({ brandId }: { brandId: string }) {
  const qc = useQueryClient();
  const projects = useQuery({
    queryKey: ['projects', brandId],
    queryFn: () => listProjects(brandId),
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const create = useMutation({
    mutationFn: () =>
      createProject({
        brand_id: brandId,
        name: name.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', brandId] });
      setName('');
      setDescription('');
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card p-3">
        <p className="text-sm font-medium">New project</p>
        <div className="mt-2 grid gap-2 md:grid-cols-[1fr_2fr_auto]">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Q2 Champions League"
            />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="optional"
            />
          </div>
          <Button
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate()}
            className="self-end"
          >
            {create.isPending ? 'Creating…' : 'Create'}
          </Button>
        </div>
        {create.isError ? (
          <p className="mt-2 text-xs text-destructive">
            {create.error instanceof Error
              ? create.error.message
              : String(create.error)}
          </p>
        ) : null}
      </div>

      {projects.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (projects.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        <div className="overflow-hidden rounded-md border bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Tags</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.data!.map((p: Project) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {p.description ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {(p.tags ?? []).join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2">{p.is_active ? 'yes' : 'no'}</td>
                  <td className="px-3 py-2">
                    <Link
                      className="text-xs underline underline-offset-2"
                      href={`/assets` as never}
                    >
                      Open assets →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
