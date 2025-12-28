/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't fail build on lint errors (we can fix them gradually)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable compression
  compress: true,
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ];
  },
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Enable experimental features if needed
  experimental: {
    // Add any experimental features here
  },
  // Configure webpack to exclude old React Router files
  webpack: (config, { isServer }) => {
    // Exclude old React Router files (legacy files from before Next.js migration)
    // These files use react-router-dom which we don't have, causing build errors
    const excludePatterns = [
      /src[\\/]pages[\\/].*\.(tsx|ts|jsx|js)$/,
      /src[\\/]App\.(tsx|ts|jsx|js)$/,
      /src[\\/]main\.(tsx|ts|jsx|js)$/,
      /src[\\/]components[\\/]NavLink\.(tsx|ts|jsx|js)$/,
    ];
    
    excludePatterns.forEach(pattern => {
      config.module.rules.push({
        test: pattern,
        use: {
          loader: 'null-loader',
        },
      });
    });
    
    // Optimize bundle splitting
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for large libraries
            framerMotion: {
              name: 'framer-motion',
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              chunks: 'all',
              priority: 20,
            },
            // Vendor chunk for other large libraries
            vendor: {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              chunks: 'all',
              priority: 10,
            },
          },
        },
      };
    }
    
    return config;
  },
};

export default nextConfig;
