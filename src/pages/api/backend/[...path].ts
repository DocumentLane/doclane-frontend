import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { IncomingHttpHeaders } from "node:http";
import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function createProxyHeaders(
  headers: IncomingHttpHeaders,
  target: URL,
): IncomingHttpHeaders {
  const proxyHeaders: IncomingHttpHeaders = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(lowerKey) || lowerKey === "host") {
      continue;
    }

    proxyHeaders[key] = value;
  }

  proxyHeaders.host = target.host;

  return proxyHeaders;
}

function getPath(req: NextApiRequest): string {
  const path = req.query.path;
  const segments = Array.isArray(path) ? path : path ? [path] : [];
  const pathname = `/${segments.map(encodeURIComponent).join("/")}`;
  const queryIndex = req.url?.indexOf("?") ?? -1;

  return queryIndex === -1 ? pathname : `${pathname}${req.url?.slice(queryIndex)}`;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = process.env.BACKEND_ORIGIN ?? "http://localhost:3000";
  const target = new URL(getPath(req), origin);
  const request = target.protocol === "https:" ? httpsRequest : httpRequest;

  const proxyReq = request(
    target,
    {
      method: req.method,
      headers: createProxyHeaders(req.headers, target),
    },
    (proxyRes) => {
      res.statusCode = proxyRes.statusCode ?? 502;

      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (value !== undefined && !HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      }

      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (error) => {
    if (!res.headersSent) {
      res.status(502).json({
        message: "Backend proxy request failed",
        error: error.message,
      });
      return;
    }

    res.destroy(error);
  });

  req.pipe(proxyReq);
}
