import { getRequestConfig } from 'next-intl/server';

// UI is English-only per UI_LANGUAGE_SPEC.md. We still ship next-intl from day one
// so no user-facing string is ever hard-coded in a component.
export default getRequestConfig(async () => {
  return {
    locale: 'en',
    messages: (await import('./messages/en.json')).default,
  };
});
