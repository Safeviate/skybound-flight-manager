import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'handlebars/dist/cjs/handlebars.js': 'handlebars',
      'handlebars': 'handlebars',
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
  experimental: {
    serverComponentsExternalPackages: ['genkit', 'dotprompt', 'handlebars', '@genkit-ai/google-genai'],
  },
};

export default nextConfig;