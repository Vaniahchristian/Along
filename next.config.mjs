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
  turbopack: {}
};

export default withPWA(nextConfig);
