'use client';

import { useEffect, useState, type PropsWithChildren } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { me, type User } from '@/lib/auth';
import { ApiError, getAccessToken } from '@/lib/api';
import { useCurrentBrand } from '@/lib/currentBrand';
import { Sidebar } from '@/components/layout/sidebar';

const PAGES_WITHOUT_BRAND_REQUIREMENT = new Set([
  '/select-brand',
  '/admin',
]);

export default function AppLayout({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [brand] = useCurrentBrand();

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    me()
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login');
        }
      })
      .finally(() => setChecked(true));
  }, [router]);

  useEffect(() => {
    if (!checked || !user) return;
    if (brand) return;
    const exempt =
      pathname &&
      Array.from(PAGES_WITHOUT_BRAND_REQUIREMENT).some((p) =>
        pathname.startsWith(p),
      );
    if (!exempt) router.replace('/select-brand');
  }, [brand, checked, user, pathname, router]);

  if (!checked) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-8 text-sm backdrop-blur">
          <div className="text-muted-foreground" />
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {user.primary_role.replace('_', ' ')}
              {user.is_system_admin ? ' · system admin' : ''}
            </span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] p-8">{children}</main>
      </div>
    </div>
  );
}
