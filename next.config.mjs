/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
