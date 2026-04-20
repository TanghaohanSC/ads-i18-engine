'use client';

import { LocalizePanel } from '@/components/localize/LocalizePanel';

export default function TextLocalizePage() {
  return (
    <LocalizePanel
      title="Text localization"
      subtitle="Paste copy or upload .txt / .md / .csv files. Each source runs a separate job."
      mediaType="text"
      accept=".txt,.md,.markdown,.csv"
      allowMultiple
      allowPaste
      hint=".csv rows become separate Localizable Units so you can translate cell-by-cell."
    />
  );
}
