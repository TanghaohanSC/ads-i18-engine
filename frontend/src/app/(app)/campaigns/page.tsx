'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentBrand } from '@/lib/currentBrand';
import { createProject, listProjects, updateProject, type Project } from '@/lib/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function CampaignsPage() {
  const [brand] = useCurrentBrand();
  const qc = useQueryClient();
  const projects = useQuery({
    queryKey: ['projects', brand?.id],
    queryFn: () => listProjects(brand!.id),
    enabled: !!brand,
  });

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const create = useMutation({
    mutationFn: () =>
      createProject({
        brand_id: brand!.id,
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      }),
    onSuccess: () => {
      setNewName('');
      setNewDescription('');
      qc.invalidateQueries({ queryKey: ['projects', brand?.id] });
    },
  });

  if (!brand) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          Campaigns group source assets inside <span className="font-medium">{brand.name}</span>.
          Each campaign can layer its own prompt guidance on top of the brand&apos;s.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New campaign</CardTitle>
          <CardDescription>
            Name + description. Prompt additions can be added after creation.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Q2 Champions League"
            />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="optional"
            />
          </div>
          <Button
            disabled={!newName.trim() || create.isPending}
            onClick={() => create.mutate()}
            className="self-end"
          >
            {create.isPending ? 'Creating…' : 'Create'}
          </Button>
        </CardContent>
      </Card>

      {projects.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (projects.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No campaigns yet.</p>
      ) : (
        <div className="space-y-3">
          {projects.data!.map((p) => (
            <CampaignCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ project }: { project: Project }) {
  const qc = useQueryClient();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [promptAdditions, setPromptAdditions] = useState(
    project.prompt_additions ?? '',
  );

  const save = useMutation({
    mutationFn: () =>
      updateProject(project.id, {
        name,
        description,
        prompt_additions: promptAdditions,
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['projects', project.brand_id] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{project.name}</CardTitle>
        <CardDescription className="font-mono text-xs">
          {project.id}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Campaign prompt additions</Label>
          <textarea
            className="mt-1 h-28 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            placeholder="Layered on top of the brand's prompt additions for this campaign only"
            value={promptAdditions}
            onChange={(e) => setPromptAdditions(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            {promptAdditions.length} / 4000
          </p>
        </div>
        {save.isError ? (
          <p className="text-xs text-destructive">
            {save.error instanceof Error ? save.error.message : String(save.error)}
          </p>
        ) : null}
        <Button
          size="sm"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}
