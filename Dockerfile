FROM oven/bun:1.2 AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.2 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV SKIP_ENV_VALIDATION=true
RUN bun run build

FROM oven/bun:1.2 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV OLLAMA_HOST=http://ollama:11434
ENV OLLAMA_MODEL=qwen2.5-coder
ENV OLLAMA_REASONING_MODEL=deepseek-r1
ENV OLLAMA_EMBED_MODEL=nomic-embed-text
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/workers ./workers
COPY --from=builder /app/src ./src
EXPOSE 3000
CMD ["bun", "run", "start"]
