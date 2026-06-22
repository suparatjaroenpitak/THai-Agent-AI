# Deployment

## Local

```bash
bun install
docker compose up -d postgres redis
cp .env.example .env
bun run db:generate
bun run db:migrate
bun run seed
bun run dev
```

Run the worker and WebSocket server in separate shells:

```bash
bun run worker
bun run ws
```

## Docker

```bash
docker compose up --build
```

## Targets

- Vercel: deploy the Next.js app and run workers separately on Railway, Render, Coolify, or a VM.
- Cloudflare: store artifacts and workspace snapshots in R2; deploy frontend separately if desired.
- Railway/Render/Coolify: run `app`, `worker`, `websocket`, `postgres`, and `redis` services from `docker-compose.yml`.
- Ubuntu: install Docker, clone repository, configure `.env`, then run `docker compose up -d --build`.

## Required Services

- PostgreSQL for Drizzle schema, auth, workspace, memory, code index, usage, billing, logs, and tasks.
- Redis for queue, retry, cancel/resume, worker events, terminal streams, and WebSocket fan-out.
- Cloudflare R2 for artifacts, logs, uploads, generated archives, and persistent workspace snapshots.
