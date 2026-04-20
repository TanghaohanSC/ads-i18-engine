'use client';

import { LocalizePanel } from '@/components/localize/LocalizePanel';

export default function VideoLocalizePage() {
  return (
    <LocalizePanel
      title="Video localization"
      subtitle="Upload a finished MP4. Frames stay bit-identical; only the audio track is regenerated."
      mediaType="video"
      accept=".mp4,video/mp4"
      allowMultiple={false}
      hint="Input technical properties (ratio, duration, fps) are preserved."
    />
  );
}
