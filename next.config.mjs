/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable experimental features if needed
  experimental: {
    // Add any experimental features here
  },
  // Configure path aliases (already handled by tsconfig.json)
  // But we can add webpack config if needed
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
