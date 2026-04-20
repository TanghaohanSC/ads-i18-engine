'use client';

import { TagInput } from './TagInput';
import { Label } from '@/components/ui/label';

export type BrandVoiceValue = {
  attributes: string[];
  personality_description: string;
  voice_dos: string[];
  voice_donts: string[];
  prohibited_phrases: string[];
};

export function normalizeVoice(raw: unknown): BrandVoiceValue {
  const v = (raw ?? {}) as Partial<BrandVoiceValue>;
  return {
    attributes: Array.isArray(v.attributes) ? v.attributes.map(String) : [],
    personality_description: String(v.personality_description ?? ''),
    voice_dos: Array.isArray(v.voice_dos) ? v.voice_dos.map(String) : [],
    voice_donts: Array.isArray(v.voice_donts) ? v.voice_donts.map(String) : [],
    prohibited_phrases: Array.isArray(v.prohibited_phrases)
      ? v.prohibited_phrases.map(String)
      : [],
  };
}

export function VoiceEditor({
  value,
  onChange,
}: {
  value: BrandVoiceValue;
  onChange: (next: BrandVoiceValue) => void;
}) {
  function patch(partial: Partial<BrandVoiceValue>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-5">
      <section>
        <Label className="text-sm">Voice attributes</Label>
        <p className="text-xs text-muted-foreground">
          Short adjectives. Feed the transcreation prompt. Examples: confident,
          inclusive, playful, direct.
        </p>
        <div className="mt-2">
          <TagInput
            values={value.attributes}
            onChange={(v) => patch({ attributes: v })}
            placeholder="add attribute + Enter"
          />
        </div>
      </section>

      <section>
        <Label className="text-sm">Personality description</Label>
        <p className="text-xs text-muted-foreground">
          One or two sentences describing how the brand sounds.
        </p>
        <textarea
          className="mt-2 h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
          value={value.personality_description}
          onChange={(e) => patch({ personality_description: e.target.value })}
          placeholder="e.g. Confident but understated; a veteran sports fan, never a hype-man."
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-sm">Do</Label>
          <p className="text-xs text-muted-foreground">
            Specific things the copy should do. Enter one per line.
          </p>
          <ListEditor
            values={value.voice_dos}
            onChange={(v) => patch({ voice_dos: v })}
            placeholder="e.g. Use concrete match examples"
          />
        </div>
        <div>
          <Label className="text-sm">Don&apos;t</Label>
          <p className="text-xs text-muted-foreground">
            Things the copy should avoid.
          </p>
          <ListEditor
            values={value.voice_donts}
            onChange={(v) => patch({ voice_donts: v })}
            placeholder="e.g. Avoid guaranteed-outcome phrasing"
          />
        </div>
      </section>

      <section>
        <Label className="text-sm">Prohibited phrases</Label>
        <p className="text-xs text-muted-foreground">
          Exact phrases never to use, case-insensitive. Blocked in every target.
        </p>
        <div className="mt-2">
          <TagInput
            values={value.prohibited_phrases}
            onChange={(v) => patch({ prohibited_phrases: v })}
            placeholder="add phrase + Enter"
          />
        </div>
      </section>
    </div>
  );
}

function ListEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  function update(i: number, v: string) {
    const next = [...values];
    next[i] = v;
    onChange(next);
  }
  function remove(i: number) {
    onChange(values.filter((_, x) => x !== i));
  }

  return (
    <div className="mt-2 space-y-1">
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="flex-1 rounded-md border bg-transparent px-3 py-1.5 text-xs"
            value={v}
            placeholder={placeholder}
            onChange={(e) => update(i, e.target.value)}
          />
          <button
            type="button"
            className="rounded border px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => remove(i)}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-xs text-primary underline-offset-2 hover:underline"
        onClick={() => onChange([...values, ''])}
      >
        + Add item
      </button>
    </div>
  );
}
