'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { listBrands, type Brand } from '@/lib/brands';
import { setCurrentBrand } from '@/lib/currentBrand';
import { me } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function SelectBrandPage() {
  const router = useRouter();
  const brands = useQuery({ queryKey: ['brands'], queryFn: listBrands });
  const user = useQuery({ queryKey: ['me'], queryFn: me });

  // If the user has exactly one brand, auto-select and go home.
  useEffect(() => {
    if (brands.data && brands.data.length === 1) {
      const b = brands.data[0];
      setCurrentBrand({ id: b.id, name: b.name, slug: b.slug });
      router.replace('/dashboard');
    }
  }, [brands.data, router]);

  function pick(b: Brand) {
    setCurrentBrand({ id: b.id, name: b.name, slug: b.slug });
    router.replace('/dashboard');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pick a brand to work on</CardTitle>
          <CardDescription>
            Everything inside the app is scoped to one brand at a time. Switch
            later from the sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {brands.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (brands.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any brand memberships yet. A system admin
              needs to invite you or create one.
              {user.data?.is_system_admin ? (
                <>
                  {' '}
                  <Button
                    className="ml-1"
                    size="sm"
                    onClick={() => router.push('/admin')}
                  >
                    Go to admin
                  </Button>
                </>
              ) : null}
            </p>
          ) : (
            <ul className="divide-y">
              {brands.data!.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {b.slug}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => pick(b)}>
                    Select
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
