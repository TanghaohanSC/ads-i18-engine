'use client';

import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function WorkflowPage() {
  const t = useTranslations('Workflow');
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {(['awaitingConfirmation', 'confirmed', 'distributed'] as const).map(
          (key) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-base">
                  {t(`queues.${key}`)}
                </CardTitle>
                <CardDescription>0 assets</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Phase 4 deliverable.
                </p>
              </CardContent>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}
