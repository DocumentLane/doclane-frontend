import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import type { NextConfig } from "next";

const createNextConfig = (phase: string): NextConfig => ({
  reactStrictMode: true,
  output: "standalone",
  devIndicators: false,
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
