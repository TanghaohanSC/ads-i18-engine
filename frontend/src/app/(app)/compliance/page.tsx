'use client';

import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function CompliancePage() {
  const t = useTranslations('Compliance');
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('systemRules')}</CardTitle>
          <CardDescription>
            Two-layer rule model (system defaults + brand overrides) lands in Phase 4.
            See <code>docs/COMPLIANCE_GOVERNANCE.md</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All findings are advisory — the compliance engine never blocks submission.
            Ad Ops owns the confirmation click.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
