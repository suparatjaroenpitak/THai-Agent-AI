import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    APP_URL: z.string().url().default("http://localhost:3000"),
    BETTER_AUTH_SECRET: z.string().min(16).default("development-secret-change-me"),
    DATABASE_URL: z.string().url().default("postgres://opencodex:opencodex@localhost:5432/opencodex"),
    REDIS_URL: z.string().url().default("redis://localhost:6379"),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().default("opencodex"),
    R2_PUBLIC_URL: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GITHUB_APP_ID: z.string().optional(),
    GITHUB_APP_PRIVATE_KEY: z.string().optional(),
    OLLAMA_HOST: z.string().url().default("http://localhost:11434"),
    OLLAMA_MODEL: z.string().default("qwen2.5-coder"),
    OLLAMA_REASONING_MODEL: z.string().default("deepseek-r1"),
    OLLAMA_EMBED_MODEL: z.string().default("nomic-embed-text"),
    AUTO_PULL_MODEL: z.string().default("false"),
    OTEL_SERVICE_NAME: z.string().default("opencodex"),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
    WORKER_SHARED_SECRET: z.string().min(8).default("local-worker-secret"),
    WEBSOCKET_PORT: z.coerce.number().default(3001)
  },
  client: {
    NEXT_PUBLIC_APP_NAME: z.string().default("OpenCodex"),
    NEXT_PUBLIC_WEBSOCKET_URL: z.string().url().optional()
  },
  runtimeEnv: {
    APP_URL: process.env.APP_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: process.env.R2_BUCKET,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITHUB_APP_ID: process.env.GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
    OLLAMA_HOST: process.env.OLLAMA_HOST,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    OLLAMA_REASONING_MODEL: process.env.OLLAMA_REASONING_MODEL,
    OLLAMA_EMBED_MODEL: process.env.OLLAMA_EMBED_MODEL,
    AUTO_PULL_MODEL: process.env.AUTO_PULL_MODEL,
    OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    WORKER_SHARED_SECRET: process.env.WORKER_SHARED_SECRET,
    WEBSOCKET_PORT: process.env.WEBSOCKET_PORT,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true"
});
