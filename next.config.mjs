/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't fail build on lint errors (we can fix them gradually)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Output standalone for better deployment
  output: 'standalone',
  // Enable experimental features if needed
  experimental: {
    // Add any experimental features here
  },
  // Configure webpack to exclude old React Router files
  webpack: (config) => {
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
    
    return config;
  },
};

export default nextConfig;
