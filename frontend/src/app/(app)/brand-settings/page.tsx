'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentBrand } from '@/lib/currentBrand';
import { getBrand, updateBrand } from '@/lib/brands';
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
import {
  RestrictionsEditor,
  normalizeRestrictions,
  type BrandRestrictionsValue,
} from '@/components/brand/RestrictionsEditor';
import {
  VoiceEditor,
  normalizeVoice,
  type BrandVoiceValue,
} from '@/components/brand/VoiceEditor';

export default function BrandSettingsPage() {
  const [brand] = useCurrentBrand();
  const qc = useQueryClient();
  const brandQ = useQuery({
    queryKey: ['brand', brand?.id],
    queryFn: () => getBrand(brand!.id),
    enabled: !!brand,
  });

  const [name, setName] = useState('');
  const [promptAdditions, setPromptAdditions] = useState('');
  const [lockBrandName, setLockBrandName] = useState(true);
  const [restrictions, setRestrictions] = useState<BrandRestrictionsValue>(
    normalizeRestrictions({}),
  );
  const [voice, setVoice] = useState<BrandVoiceValue>(normalizeVoice({}));

  useEffect(() => {
    const b = brandQ.data;
    if (b) {
      setName(b.name);
      setPromptAdditions(b.prompt_additions ?? '');
      setLockBrandName(b.lock_brand_name);
      setRestrictions(normalizeRestrictions(b.restrictions));
      setVoice(normalizeVoice(b.voice));
    }
  }, [brandQ.data]);

  const save = useMutation({
    mutationFn: () => {
      if (!brand) throw new Error('no brand selected');
      return updateBrand(brand.id, {
        name,
        lock_brand_name: lockBrandName,
        prompt_additions: promptAdditions,
        restrictions: restrictions as unknown as Record<string, unknown>,
        voice: voice as unknown as Record<string, unknown>,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand', brand?.id] }),
  });

  if (!brand) return null;
  if (brandQ.isLoading || !brandQ.data)
    return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Brand settings</h1>
        <p className="text-sm text-muted-foreground">
          These apply to every localization job run under{' '}
          <span className="font-medium">{brand.name}</span>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>
            Slug is fixed once created. Locking the brand name keeps brand-name
            LUs as keep_original by default.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={brandQ.data.slug} disabled />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand prompt additions</CardTitle>
          <CardDescription>
            Free-form system-prompt instructions that the translator, reviewer,
            and image editor all receive on every call under this brand. Use it
            for standing rules that don&apos;t fit restrictions / voice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            className="h-40 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            placeholder={`e.g.\n- Always use "bet" not "wager" in US markets\n- Never mention specific odds numbers\n- Reference the Premier League over MLS when possible`}
            value={promptAdditions}
            onChange={(e) => setPromptAdditions(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {promptAdditions.length} / 4000 chars
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Restrictions</CardTitle>
          <CardDescription>
            What the AI must never produce for this brand. Every item here
            reaches the prompt assembly as a negative directive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RestrictionsEditor value={restrictions} onChange={setRestrictions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice</CardTitle>
          <CardDescription>
            Drives transcreation + audio regen. Only the transcreate /
            video_audio_replace use cases pull from here by default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VoiceEditor value={voice} onChange={setVoice} />
        </CardContent>
      </Card>

      {save.isError ? (
        <p className="text-xs text-destructive">
          {save.error instanceof Error ? save.error.message : String(save.error)}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : `Save (version ${brandQ.data.version})`}
        </Button>
      </div>
    </div>
  );
}
