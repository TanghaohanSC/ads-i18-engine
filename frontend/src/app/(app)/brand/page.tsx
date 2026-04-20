'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createBrand, listBrands, type Brand } from '@/lib/brands';
import { me } from '@/lib/auth';
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

export default function BrandPage() {
  const qc = useQueryClient();
  const user = useQuery({ queryKey: ['me'], queryFn: me });
  const brands = useQuery({
    queryKey: ['brands'],
    queryFn: listBrands,
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const create = useMutation({
    mutationFn: () => createBrand({ name: name.trim(), slug: slug.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands'] });
      setOpen(false);
      setName('');
      setSlug('');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Brands</h1>
        {user.data?.is_system_admin ? (
          <Button size="sm" onClick={() => setOpen((o) => !o)}>
            {open ? 'Cancel' : '+ New brand'}
          </Button>
        ) : null}
      </div>

      {open ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create brand</CardTitle>
            <CardDescription>
              Slug must be lowercase letters / digits / hyphens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Sportsbook"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  )
                }
                placeholder="acme-sportsbook"
              />
            </div>
            {create.isError ? (
              <p className="text-xs text-destructive">
                {create.error instanceof Error
                  ? create.error.message
                  : String(create.error)}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!name.trim() || !slug.trim() || create.isPending}
                onClick={() => create.mutate()}
              >
                {create.isPending ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Your brands</CardTitle>
          <CardDescription>
            Click a brand to manage projects, restrictions, voice, and
            compliance overrides.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {brands.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (brands.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No brands yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {brands.data!.map((b: Brand) => (
                <li key={b.id}>
                  <Link
                    href={`/brand/${b.id}` as never}
                    className="flex items-center justify-between py-2 hover:bg-accent/40"
                  >
                    <span className="font-medium">{b.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {b.slug}
                      {!b.is_active ? ' · archived' : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
