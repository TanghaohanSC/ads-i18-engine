'use client';

import { useRouter } from 'next/navigation';
import { ChevronsUpDown } from 'lucide-react';

import { useCurrentBrand } from '@/lib/currentBrand';

export function BrandSwitcher() {
  const router = useRouter();
  const [brand] = useCurrentBrand();

  return (
    <div className="mx-3 mb-3 rounded-lg border border-border bg-card-elevated p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Brand
      </p>
      {brand ? (
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{brand.name}</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              {brand.slug}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => router.push('/select-brand')}
            aria-label="Switch brand"
          >
            <ChevronsUpDown className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="mt-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
          onClick={() => router.push('/select-brand')}
        >
          Pick a brand →
        </button>
      )}
    </div>
  );
}
