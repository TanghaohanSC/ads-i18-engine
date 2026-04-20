'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { useCurrentBrand } from '@/lib/currentBrand';
import { me } from '@/lib/auth';
import { listProjects } from '@/lib/projects';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const SHORTCUTS = [
  {
    href: '/localize/text',
    title: 'Text localization',
    desc: 'Translate copy across 8 markets.',
  },
  {
    href: '/localize/image',
    title: 'Image localization',
    desc: 'Per-market banners with AI edits + compliance overlays.',
  },
  {
    href: '/localize/video',
    title: 'Video localization',
    desc: 'Regenerate audio, preserve frames.',
  },
];

export default function DashboardPage() {
  const [brand] = useCurrentBrand();
  const user = useQuery({ queryKey: ['me'], queryFn: me });
  const projects = useQuery({
    queryKey: ['projects', brand?.id],
    queryFn: () => listProjects(brand!.id),
    enabled: !!brand,
  });

  if (!brand) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {brand.name}
          {user.data ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              · welcome, {user.data.name}
            </span>
          ) : null}
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick a localization flow below or jump into campaigns / brand
          settings from the sidebar.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href as never}
            className="group rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40"
          >
            <p className="text-base font-semibold">{s.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
            <p className="mt-3 text-xs text-primary underline-offset-2 group-hover:underline">
              Open →
            </p>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaigns in this brand</CardTitle>
          <CardDescription>
            Each campaign groups source assets and can carry its own prompt
            additions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (projects.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No campaigns yet.{' '}
              <Link href="/campaigns" className="underline">
                Create one →
              </Link>
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {projects.data!.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <span className="font-medium">{p.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.prompt_additions ? 'prompt ✓' : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
