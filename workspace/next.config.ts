
import type {NextConfig} from 'next';
import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development' || process.env.PWA_DISABLED === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    // Use the build-time argument for the build process.
    // The runtime will use the secret defined in the runConfig's env section.
    GEMINI_API_KEY: process.env.BUILD_GEMINI_API_KEY,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-control-allow-headers", value: "x-firebase-appcheck" }
        ]
      }
    ]
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
  webpack: (config, { isServer }) => {
    // This is to fix a bug in genkit with handlebars
    config.resolve.alias = {
      ...config.resolve.alias,
      'handlebars': 'handlebars/dist/handlebars.js',
    }
    return config
  }
};

export default pwaConfig(nextConfig);
