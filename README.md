# Doclane Frontend

Next.js reader UI for Doclane. API calls go through `/api/backend/*`, which is rewritten to the configured backend origin.

## Requirements

- Node.js 22
- pnpm
- Doclane backend API

## Environment

Copy `.env.example` to `.env` and set the backend origin.

```bash
cp .env.example .env
```

For local development, `BACKEND_ORIGIN` should point to the backend API, for example `http://localhost:3000`.

## Local Development

```bash
pnpm install
pnpm dev
```

## Dockerfile

Build the frontend image:

```bash
docker build --build-arg BACKEND_ORIGIN=http://host.docker.internal:3000 -t doclane-frontend .
```

Run the frontend container:

```bash
docker run --rm -p 3001:3000 \
  -e BACKEND_ORIGIN="http://host.docker.internal:3000" \
  doclane-frontend
```

The frontend is exposed at `localhost:3001` and expects the backend API at `host.docker.internal:3000`.

## Verification

After frontend changes, run:

```bash
pnpm lint
pnpm build
```
