import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // Permite que o build termine mesmo com erros de TypeScript
    ignoreBuildErrors: true,
  },
  eslint: {
    // Permite que o build termine mesmo com erros de Linting
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;