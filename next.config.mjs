/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['archiver'],
  experimental: {
    // The auth proxy buffers request bodies (default 10 MB). Media uploads can be
    // up to 80 MB, so give them room; /api/restore is excluded from the proxy and
    // streams its ZIP body to disk instead.
    proxyClientMaxBodySize: '100mb',
  },
};

export default nextConfig;
