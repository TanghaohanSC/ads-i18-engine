'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { getBrand } from '@/lib/brands';
import { BrandOverrides } from '@/components/brand/BrandOverrides';
import { BrandProjects } from '@/components/brand/BrandProjects';
import { BrandSettings } from '@/components/brand/BrandSettings';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type TabKey = 'settings' | 'projects' | 'overrides';

const TABS: { key: TabKey; label: string; description: string }[] = [
  {
    key: 'settings',
    label: 'Settings',
    description: 'Brand name, voice, restrictions, display names per market.',
  },
  {
    key: 'projects',
    label: 'Projects',
    description: 'Projects group source assets under this brand.',
  },
  {
    key: 'overrides',
    label: 'Compliance overrides',
    description:
      'Add brand-specific rules or tighten / relax / disable system defaults. Every change is logged.',
  },
];

export default function BrandDetailPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('settings');

  const brand = useQuery({
    queryKey: ['brand', brandId],
    queryFn: () => getBrand(brandId),
  });

  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {brand.data?.name ?? 'Brand'}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {brand.data?.slug ?? brandId}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/brand')}>
          Back to brands
        </Button>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map((x) => (
          <button
            key={x.key}
            type="button"
            className={cn(
              'px-4 py-2 text-sm transition-colors',
              tab === x.key
                ? 'border-b-2 border-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setTab(x.key)}
          >
            {x.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{active.description}</p>

      {tab === 'settings' ? <BrandSettings brandId={brandId} /> : null}
      {tab === 'projects' ? <BrandProjects brandId={brandId} /> : null}
      {tab === 'overrides' ? <BrandOverrides brandId={brandId} /> : null}
    </div>
  );
}
