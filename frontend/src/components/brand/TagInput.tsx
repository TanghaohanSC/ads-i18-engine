'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

export function TagInput({
  values,
  onChange,
  placeholder,
  className,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState('');

  function commit() {
    const v = draft.trim();
    if (!v) return;
    if (values.includes(v)) {
      setDraft('');
      return;
    }
    onChange([...values, v]);
    setDraft('');
  }

  function remove(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1 rounded-md border bg-background px-2 py-1',
        className,
      )}
    >
      {values.map((v, i) => (
        <span
          key={v + i}
          className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs"
        >
          <span>{v}</span>
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-muted-foreground hover:text-destructive"
            aria-label={`remove ${v}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="min-w-[120px] flex-1 bg-transparent py-1 text-xs outline-none"
        value={draft}
        placeholder={placeholder ?? 'type + Enter'}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Backspace' && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={commit}
      />
    </div>
  );
}
