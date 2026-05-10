# Doclane Frontend

Next.js reader UI for Doclane. Browser API calls use `/api/*`; route that path to the backend at the infrastructure proxy layer.

## Requirements

- Node.js 22
- pnpm
- Doclane backend API

## Environment

Copy `.env.example` to `.env` and set the backend origin for server-side backend calls.

```bash
cp .env.example .env
```

For local development, `BACKEND_ORIGIN` should point to the backend API, for example `http://localhost:3000`. `next dev` rewrites browser requests from `/api/*` to `BACKEND_ORIGIN`.

## Local Development

```bash
pnpm install
pnpm dev
```

## Dockerfile

Build the frontend image:

```bash
docker build -t doclane-frontend .
```

Run the frontend container:

```bash
docker run --rm -p 3001:3000 \
  -e BACKEND_ORIGIN="http://backend:3000" \
  doclane-frontend
```

The production frontend container serves only the Next.js app. Route `/api/*` to the backend through the infrastructure proxy:

- `/api/*` to `backend:3000`
- `/*` to `frontend:3000`

## Verification

After frontend changes, run:

```bash
pnpm lint
pnpm build
```
