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

- **Render.com**: You can easily deploy the entire stack to Render by using the provided `render.yaml` Blueprint. Simply connect your GitHub repository to Render and create a new Blueprint. The blueprint automatically sets up:
  - PostgreSQL Database
  - Redis 
  - Ollama Private Service (Requires a paid tier instance for sufficient memory, GPU is normally not included in Render Web Web Services).
  - Next.js Web App
  - Worker Background Service
  *(When using Render, configure `OLLAMA_MODEL` to a small model like `qwen2.5:3b` or `phi4` to avoid taking up all RAM).*
- Vercel: deploy the Next.js app and run workers separately on Railway, Render, Coolify, or a VM.
- Cloudflare: store artifacts and workspace snapshots in R2; deploy frontend separately if desired.
- Railway/Coolify: run `app`, `worker`, `websocket`, `postgres`, and `redis` services from `docker-compose.yml`.
- Ubuntu: install Docker, clone repository, configure `.env`, then run `docker compose up -d --build`.

## Required Services

- PostgreSQL for Drizzle schema, auth, workspace, memory, code index, usage, billing, logs, and tasks.
- Redis for queue, retry, cancel/resume, worker events, terminal streams, and WebSocket fan-out.
- Cloudflare R2 for artifacts, logs, uploads, generated archives, and persistent workspace snapshots.
