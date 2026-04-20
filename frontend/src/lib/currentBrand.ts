'use client';

import { useEffect, useState } from 'react';

const KEY = 'al_current_brand';

export type CurrentBrand = {
  id: string;
  name: string;
  slug: string;
};

export function getCurrentBrand(): CurrentBrand | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CurrentBrand;
  } catch {
    return null;
  }
}

export function setCurrentBrand(b: CurrentBrand | null) {
  if (typeof window === 'undefined') return;
  if (!b) window.localStorage.removeItem(KEY);
  else window.localStorage.setItem(KEY, JSON.stringify(b));
  // Notify listeners in the same tab.
  window.dispatchEvent(new CustomEvent('al:brand-change'));
}

export function useCurrentBrand(): [CurrentBrand | null, (b: CurrentBrand | null) => void] {
  const [brand, setBrand] = useState<CurrentBrand | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setBrand(getCurrentBrand());
    setReady(true);
    function onChange() {
      setBrand(getCurrentBrand());
    }
    window.addEventListener('al:brand-change', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('al:brand-change', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  function update(next: CurrentBrand | null) {
    setCurrentBrand(next);
    setBrand(next);
  }

  return [ready ? brand : null, update];
}
