'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getBrand, updateBrand } from '@/lib/brands';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function BrandSettings({ brandId }: { brandId: string }) {
  const qc = useQueryClient();
  const brand = useQuery({
    queryKey: ['brand', brandId],
    queryFn: () => getBrand(brandId),
  });

  const [name, setName] = useState('');
  const [lockBrandName, setLockBrandName] = useState(true);
  const [restrictionsText, setRestrictionsText] = useState('');
  const [voiceText, setVoiceText] = useState('');

  useEffect(() => {
    if (brand.data) {
      setName(brand.data.name);
      setLockBrandName(brand.data.lock_brand_name);
      setRestrictionsText(JSON.stringify(brand.data.restrictions, null, 2));
      setVoiceText(JSON.stringify(brand.data.voice, null, 2));
    }
  }, [brand.data]);

  const save = useMutation({
    mutationFn: () => {
      let restrictions: Record<string, unknown> | undefined;
      let voice: Record<string, unknown> | undefined;
      try {
        restrictions = restrictionsText ? JSON.parse(restrictionsText) : {};
        voice = voiceText ? JSON.parse(voiceText) : {};
      } catch (e) {
        throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : e}`);
      }
      return updateBrand(brandId, {
        name,
        lock_brand_name: lockBrandName,
        restrictions,
        voice,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand', brandId] }),
  });

  if (brand.isLoading)
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!brand.data) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Slug (immutable)</Label>
          <Input value={brand.data.slug} disabled />
        </div>
        <label className="col-span-full flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={lockBrandName}
            onChange={(e) => setLockBrandName(e.target.checked)}
          />
          Lock brand name (strategy resolver keeps brand_name LUs as
          keep_original)
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Restrictions (JSON)</Label>
          <textarea
            className="mt-1 h-60 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-xs"
            value={restrictionsText}
            onChange={(e) => setRestrictionsText(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Shape: {`{ forbidden_elements: [{element, reason, severity}],
forbidden_themes, competitor_brands, market_specific_restrictions }`}
          </p>
        </div>
        <div>
          <Label>Voice (JSON)</Label>
          <textarea
            className="mt-1 h-60 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-xs"
            value={voiceText}
            onChange={(e) => setVoiceText(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Shape: {`{ attributes, personality_description, voice_dos,
voice_donts, prohibited_phrases }`}
          </p>
        </div>
      </div>

      {save.isError ? (
        <p className="text-xs text-destructive">
          {save.error instanceof Error ? save.error.message : String(save.error)}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : `Save (version ${brand.data.version})`}
        </Button>
      </div>
    </div>
  );
}
