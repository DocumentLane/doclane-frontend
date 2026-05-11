import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import type { NextConfig } from "next";

const serviceWorkerHeaders = [
  {
    key: "Cache-Control",
    value: "no-cache, no-store, must-revalidate",
  },
  {
    key: "Content-Type",
    value: "application/javascript; charset=utf-8",
  },
];

const createNextConfig = (phase: string): NextConfig => ({
  reactStrictMode: true,
  output: "standalone",
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: serviceWorkerHeaders,
      },
    ];
  },
  ...(phase === PHASE_DEVELOPMENT_SERVER
    ? {
        async rewrites() {
          const backendOrigin =
            process.env.BACKEND_ORIGIN ?? "http://localhost:3000";

          return [
            {
              source: "/api/:path*",
              destination: `${backendOrigin}/:path*`,
            },
          ];
        },
      }
    : {}),
});

export default createNextConfig;
