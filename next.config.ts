
import type {NextConfig} from 'next';

// Load environment variables from .env.local
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

const nextConfig: NextConfig = {
  // This is a trivial comment to force a recompilation and fix chunk loading errors.
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'handlebars': 'handlebars/dist/handlebars.js',
    }
    return config
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
