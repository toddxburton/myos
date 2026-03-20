import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Required for @cloudflare/next-on-pages
  outputFileTracingRoot: process.cwd(),
}

export default nextConfig
