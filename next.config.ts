import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  devIndicators: false,
  allowedDevOrigins: ["192.168.35.107"],
};

export default nextConfig;
