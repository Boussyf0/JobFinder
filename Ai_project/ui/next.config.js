/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    API_URL: process.env.API_URL || 'http://localhost:8083/api',
  },
  pageExtensions: ['tsx', 'ts', 'jsx', 'js', 'mdx', 'md'],
  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://localhost:8083/api';
    console.log(`Setting up API rewrites to ${apiUrl}/:path*`);
    
    try {
      // List of API paths that should be handled by our Next.js API routes
      const internalApiPaths = [
        '/api/interview/analyze-behavior',
        '/api/interview/coding',
        '/api/interview/verify-frame',
        '/api/interview/evaluate',
        '/api/interview/transcribe',
        '/api/interview/generate',
        '/api/market-insights'
      ];
      
      return [
        // Prevent rewriting paths that we handle internally
        ...internalApiPaths.map(path => ({
          source: path,
          destination: path,
        })),
        // Rewrite all other API paths to the external API
        {
          source: '/api/:path*',
          destination: `${apiUrl}/:path*`,
          basePath: false,
        },
      ];
    } catch (error) {
      console.error('Error setting up rewrites:', error);
      // Return empty rewrites array on error
      return [];
    }
  },
  // Add more configuration to handle API connectivity
  experimental: {
    largePageDataBytes: 1024 * 1000, // Increase limit for large API responses
  },
  typescript: {
    ignoreBuildErrors: true, // During development
  },
  output: 'standalone',
};

module.exports = nextConfig; 