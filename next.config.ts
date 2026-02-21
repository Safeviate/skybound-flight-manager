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
    serverActions: {
      allowedOrigins: ["*"],
    },
    serverComponentsExternalPackages: ['handlebars', 'genkit', '@genkit-ai/google-genai'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'handlebars/dist/cjs/handlebars.js': 'handlebars',
      'handlebars': 'handlebars',
    }
    return config
  },
};

export default nextConfig;