import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  typedRoutes: true,
  // Dev-only: accept requests that came in via 127.0.0.1 as same-origin so
  // /_next static assets load when the user opens that host directly.
  allowedDevOrigins: ['localhost', '127.0.0.1'],
};

export default withNextIntl(nextConfig);
