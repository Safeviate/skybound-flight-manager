import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
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
    serverComponentsExternalPackages: [
      'genkit', 
      'dotprompt', 
      'handlebars', 
      '@genkit-ai/google-genai', 
      '@genkit-ai/core', 
      '@genkit-ai/ai'
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'handlebars/dist/cjs/handlebars.js': 'handlebars',
      'handlebars': 'handlebars/dist/handlebars.js',
    }
    return config
  },
};

export default nextConfig;