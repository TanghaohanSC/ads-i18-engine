'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { ApiKeysTab } from '@/components/admin/ApiKeysTab';
import { PromptsTab } from '@/components/admin/PromptsTab';
import { RulesTab } from '@/components/admin/RulesTab';
import { SubMarketsTab } from '@/components/admin/SubMarketsTab';
import { cn } from '@/lib/cn';

type TabKey = 'sub-markets' | 'api-keys' | 'prompts' | 'rules';

const TABS: { key: TabKey; label: string; description: string }[] = [
  {
    key: 'sub-markets',
    label: 'Sub-markets',
    description:
      'Regulatory state per parent market. System admins maintain last_reviewed_at.',
  },
  {
    key: 'api-keys',
    label: 'API keys',
    description: 'Runtime config for OpenRouter gateway + model ids.',
  },
  {
    key: 'prompts',
    label: 'Prompts',
    description:
      'Editable prompt overrides per use case × market × mode. Sit between brand instructions and market culture in the assembly.',
  },
  {
    key: 'rules',
    label: 'System rules',
    description:
      'Read-only browser of system-default compliance rules. Brand overrides are managed under /brand/[id].',
  },
];

export default function AdminPage() {
  const t = useTranslations('Admin');
  const [tab, setTab] = useState<TabKey>('sub-markets');
  const active = TABS.find((x) => x.key === tab)!;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

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

      {tab === 'sub-markets' ? <SubMarketsTab /> : null}
      {tab === 'api-keys' ? <ApiKeysTab /> : null}
      {tab === 'prompts' ? <PromptsTab /> : null}
      {tab === 'rules' ? <RulesTab /> : null}
    </div>
  );
}
