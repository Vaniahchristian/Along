import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  fallbacks: {
    document: '/offline'
  }
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // next-pwa injects a webpack plugin; keep an explicit turbopack stub for Next 16.
  turbopack: {},
  images: {
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL ? [{ protocol: 'https', hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname, pathname: '/storage/v1/object/public/plan-images/**' }] : []
  }
};

export default withPWA(nextConfig);
