import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${process.env.BACKEND_ORIGIN ?? "http://localhost:3000"}/:path*`,
      },
    ];
  },
  devIndicators: false,
};

export default nextConfig;
