'use client';

import { LocalizePanel } from '@/components/localize/LocalizePanel';

export default function ImageLocalizePage() {
  return (
    <LocalizePanel
      title="Image localization"
      subtitle="Upload one or more PSD / PNG / JPG banners. Each runs its own job against the chosen market."
      mediaType="image"
      accept=".psd,.ai,.png,.jpg,.jpeg"
      allowMultiple
      hint="Flat PNG / JPG goes through Nano Banana; PSD stays deterministic."
    />
  );
}
