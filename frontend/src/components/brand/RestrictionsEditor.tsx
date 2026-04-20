'use client';

import { TagInput } from './TagInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Severity = 'critical' | 'warning' | 'info';

export type ForbiddenElement = {
  element: string;
  reason: string;
  severity: Severity;
};

export type BrandRestrictionsValue = {
  forbidden_elements: ForbiddenElement[];
  forbidden_themes: string[];
  competitor_brands: string[];
  market_specific_restrictions: Record<string, unknown>;
};

export function normalizeRestrictions(raw: unknown): BrandRestrictionsValue {
  const r = (raw ?? {}) as Partial<BrandRestrictionsValue>;
  return {
    forbidden_elements: Array.isArray(r.forbidden_elements)
      ? r.forbidden_elements.map((el) => ({
          element: String((el as ForbiddenElement)?.element ?? ''),
          reason: String((el as ForbiddenElement)?.reason ?? ''),
          severity: ((el as ForbiddenElement)?.severity ?? 'warning') as Severity,
        }))
      : [],
    forbidden_themes: Array.isArray(r.forbidden_themes)
      ? (r.forbidden_themes as string[]).map(String)
      : [],
    competitor_brands: Array.isArray(r.competitor_brands)
      ? (r.competitor_brands as string[]).map(String)
      : [],
    market_specific_restrictions:
      (r.market_specific_restrictions as Record<string, unknown>) ?? {},
  };
}

export function RestrictionsEditor({
  value,
  onChange,
}: {
  value: BrandRestrictionsValue;
  onChange: (next: BrandRestrictionsValue) => void;
}) {
  function patch(partial: Partial<BrandRestrictionsValue>) {
    onChange({ ...value, ...partial });
  }

  function addElement() {
    patch({
      forbidden_elements: [
        ...value.forbidden_elements,
        { element: '', reason: '', severity: 'warning' },
      ],
    });
  }

  function updateElement(i: number, field: keyof ForbiddenElement, v: string) {
    const next = [...value.forbidden_elements];
    next[i] = { ...next[i], [field]: v as ForbiddenElement[typeof field] };
    patch({ forbidden_elements: next });
  }

  function removeElement(i: number) {
    patch({
      forbidden_elements: value.forbidden_elements.filter((_, x) => x !== i),
    });
  }

  return (
    <div className="space-y-5">
      <section>
        <div className="flex items-center justify-between">
          <Label className="text-sm">Forbidden elements</Label>
          <Button size="sm" variant="outline" onClick={addElement}>
            + Add element
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Concrete things the AI must never include (e.g. celebrity names,
          competitor logos). Severity drives compliance severity if detected.
        </p>
        {value.forbidden_elements.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No entries.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {value.forbidden_elements.map((el, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-md border bg-background p-2 md:grid-cols-[1fr_1.5fr_120px_auto]"
              >
                <Input
                  value={el.element}
                  placeholder="Element (e.g. Cristiano Ronaldo)"
                  onChange={(e) => updateElement(i, 'element', e.target.value)}
                />
                <Input
                  value={el.reason}
                  placeholder="Reason (why it's forbidden)"
                  onChange={(e) => updateElement(i, 'reason', e.target.value)}
                />
                <select
                  className="h-9 rounded-md border bg-transparent px-2 text-sm"
                  value={el.severity}
                  onChange={(e) =>
                    updateElement(i, 'severity', e.target.value as Severity)
                  }
                >
                  <option value="critical">critical</option>
                  <option value="warning">warning</option>
                  <option value="info">info</option>
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeElement(i)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <Label className="text-sm">Forbidden themes</Label>
        <p className="text-xs text-muted-foreground">
          High-level topics to avoid (e.g. gambling-as-income, youth culture).
          Press Enter after each tag.
        </p>
        <div className="mt-2">
          <TagInput
            values={value.forbidden_themes}
            onChange={(v) => patch({ forbidden_themes: v })}
            placeholder="add theme + Enter"
          />
        </div>
      </section>

      <section>
        <Label className="text-sm">Competitor brands</Label>
        <p className="text-xs text-muted-foreground">
          Competitors that must not be named, referenced, or visually shown.
        </p>
        <div className="mt-2">
          <TagInput
            values={value.competitor_brands}
            onChange={(v) => patch({ competitor_brands: v })}
            placeholder="add competitor + Enter"
          />
        </div>
      </section>

      <section>
        <Label className="text-sm">Market-specific restrictions (advanced)</Label>
        <p className="text-xs text-muted-foreground">
          Raw JSON keyed by market/sub-market code. Most teams leave this empty
          and use the Prompts tab instead.
        </p>
        <textarea
          className="mt-2 h-24 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-xs"
          value={JSON.stringify(value.market_specific_restrictions ?? {}, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value || '{}');
              patch({ market_specific_restrictions: parsed });
            } catch {
              /* ignore partial edits */
            }
          }}
        />
      </section>
    </div>
  );
}
