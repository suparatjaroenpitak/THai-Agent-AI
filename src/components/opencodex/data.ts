import {
  Bot,
  Boxes,
  BrainCircuit,
  Bug,
  Cloud,
  Code2,
  Database,
  FileCode2,
  GitBranch,
  GitPullRequest,
  Globe2,
  Hammer,
  LockKeyhole,
  Network,
  Rocket,
  ShieldCheck,
  TestTube2,
  Workflow
} from "lucide-react";

export type AgentRole =
  | "Planner"
  | "Research"
  | "Architect"
  | "Coder"
  | "Reviewer"
  | "Tester"
  | "Debugger"
  | "Security"
  | "Documentation"
  | "DevOps"
  | "Database"
  | "Git";

export const agentWorkflow: Array<{
  role: AgentRole;
  status: "done" | "active" | "queued";
  detail: string;
}> = [
  { role: "Planner", status: "done", detail: "Breaking down task into execution steps" },
  { role: "Research", status: "done", detail: "Indexing workspace files and context" },
  { role: "Architect", status: "active", detail: "Designing solution architecture" },
  { role: "Coder", status: "queued", detail: "Generating code changes" },
  { role: "Reviewer", status: "queued", detail: "Static code review" },
  { role: "Tester", status: "queued", detail: "Generating test cases" },
  { role: "Security", status: "queued", detail: "Security audit" },
  { role: "Documentation", status: "queued", detail: "Updating docs" },
  { role: "Git", status: "queued", detail: "Preparing commit" }
];

export const supportedProviderGroups = [
  {
    name: "Coding",
    models: ["qwen2.5-coder", "codellama", "starcoder2", "deepseek-coder-v2"]
  },
  {
    name: "Reasoning",
    models: ["deepseek-r1", "qwen3", "phi4"]
  },
  {
    name: "General",
    models: ["llama3.2", "mistral", "gemma3"]
  },
  {
    name: "Embedding",
    models: ["nomic-embed-text", "mxbai-embed-large"]
  }
];

export type FileTreeNode = {
  name: string;
  type: "file" | "folder";
  badge?: string;
  children?: FileTreeNode[];
};

export const fileTree: FileTreeNode[] = [
  {
    name: "opencodex",
    type: "folder",
    children: [
      {
        name: "src",
        type: "folder",
        children: [
          { name: "app/api/agent/route.ts", type: "file", badge: "AI" },
          { name: "components/opencodex/open-codex-shell.tsx", type: "file" },
          { name: "ai/langgraph.ts", type: "file" },
          { name: "db/schema.ts", type: "file", badge: "SQL" }
        ]
      },
      {
        name: "workers",
        type: "folder",
        children: [
          { name: "node-worker.ts", type: "file" },
          { name: "socket-server.ts", type: "file" }
        ]
      },
      { name: "docker-compose.yml", type: "file" },
      { name: "README.md", type: "file" }
    ]
  }
];

export const openTabs = [
  "src/ai/langgraph.ts",
  "src/components/opencodex/open-codex-shell.tsx",
  "src/db/schema.ts"
];

export const sampleCode = `import { StateGraph, START, END } from "@langchain/langgraph";
import { runOllamaChat } from "@/ai/model-client";

export async function runOpenCodexWorkflow(input: AgentInput) {
  const graph = new StateGraph(AgentState)
    .addNode("planner", plannerAgent)
    .addNode("research", researchAgent)
    .addNode("architect", architectAgent)
    .addNode("coder", coderAgent)
    .addNode("review", reviewerAgent)
    .addNode("test", testerAgent)
    .addNode("fix", debuggerAgent)
    .addNode("security", securityAgent)
    .addNode("docs", documentationAgent)
    .addNode("commit", gitAgent)
    .addEdge(START, "planner")
    .addEdge("planner", "research")
    .addEdge("research", "architect")
    .addEdge("architect", "coder")
    .addConditionalEdges("coder", shouldReviewOrFix)
    .addEdge("review", "test")
    .addConditionalEdges("test", shouldCommitOrFix)
    .addEdge("fix", "coder")
    .addEdge("security", "docs")
    .addEdge("docs", "commit")
    .addEdge("commit", END);

  return graph.compile().invoke(input);
}`;

const shellCode = `"use client";

import { useEffect, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export function OpenCodexShell() {
  const [activeFile, setActiveFile] = useState("src/ai/langgraph.ts");

  useEffect(() => {
    setActiveFile("src/components/opencodex/open-codex-shell.tsx");
  }, []);

  return (
    <PanelGroup direction="horizontal">
      <Panel defaultSize={24}>Explorer</Panel>
      <PanelResizeHandle />
      <Panel>{activeFile}</Panel>
    </PanelGroup>
  );
}`;

const schemaCode = `import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const workspace = pgTable("workspace", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});`;

const apiRouteCode = `import { NextResponse } from "next/server";
import { runOpenCodexWorkflow } from "@/ai/langgraph";
import { routeModel } from "@/ai/router";

export async function POST(request: Request) {
  const body = await request.json();
  const routing = routeModel({ mode: body.mode ?? "auto" });
  const result = await runOpenCodexWorkflow(body);

  return NextResponse.json({
    message: result.summary,
    routing,
    steps: result.steps
  });
}`;

const workerCode = `import Redis from "ioredis";
import { runOpenCodexWorkflow } from "../src/ai/langgraph";

// Worker subscribes to Redis and executes agent workflows
const subscriber = new Redis(process.env.REDIS_URL!);
subscriber.on("message", async (_channel, raw) => {
  const event = JSON.parse(raw);
  if (event.type === "agent.workflow.queued") {
    await runOpenCodexWorkflow({
      workspaceId: event.workspaceId,
      prompt: event.prompt,
      mode: "auto"
    });
  }
});
await subscriber.subscribe("opencodex:tasks");`;

const websocketCode = `import Redis from "ioredis";

const sockets = new Set<Bun.ServerWebSocket>();
const subscriber = new Redis(process.env.REDIS_URL!);

subscriber.on("message", (_channel, raw) => {
  for (const socket of sockets) socket.send(raw);
});

await subscriber.subscribe("opencodex:events");

Bun.serve({
  port: Number(process.env.WEBSOCKET_PORT ?? 3001),
  websocket: {
    open(socket) { sockets.add(socket); },
    close(socket) { sockets.delete(socket); },
    message() {}
  }
});`;

const dockerComposeCode = `services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  ollama:
    image: ollama/ollama:latest
    ports: ["11434:11434"]
    volumes: [ollama-data:/root/.ollama]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/"]`;

const readmeCode = `# OpenCodex

Browser-native AI coding agent powered by Ollama.

## Prerequisites
- Bun v1.1+
- Ollama running locally
- PostgreSQL + Redis

## Quick Start
1. ollama pull qwen2.5-coder
2. bun install
3. docker compose up -d postgres redis
4. bun run db:generate
5. bun run dev`;

export type EditorFile = {
  path: string;
  language: string;
  content: string;
};

export const editorFiles: Record<string, EditorFile> = {
  "src/ai/langgraph.ts": {
    path: "src/ai/langgraph.ts",
    language: "typescript",
    content: sampleCode
  },
  "src/components/opencodex/open-codex-shell.tsx": {
    path: "src/components/opencodex/open-codex-shell.tsx",
    language: "typescript",
    content: shellCode
  },
  "src/db/schema.ts": {
    path: "src/db/schema.ts",
    language: "typescript",
    content: schemaCode
  },
  "src/app/api/agent/route.ts": {
    path: "src/app/api/agent/route.ts",
    language: "typescript",
    content: apiRouteCode
  },
  "workers/node-worker.ts": {
    path: "workers/node-worker.ts",
    language: "typescript",
    content: workerCode
  },
  "workers/socket-server.ts": {
    path: "workers/socket-server.ts",
    language: "typescript",
    content: websocketCode
  },
  "docker-compose.yml": {
    path: "docker-compose.yml",
    language: "yaml",
    content: dockerComposeCode
  },
  "README.md": {
    path: "README.md",
    language: "markdown",
    content: readmeCode
  }
};

function inferLanguage(path: string) {
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".yml") || path.endsWith(".yaml")) return "yaml";
  return "typescript";
}

export function getEditorFile(path: string): EditorFile {
  const language = inferLanguage(path);
  const prefix = language === "markdown" || language === "yaml" ? "#" : "//";

  return (
    editorFiles[path] ?? {
      path,
      language,
      content: `${prefix} Preview unavailable for ${path}`
    }
  );
}

export const toolGroups = [
  { name: "Filesystem", icon: FileCode2, count: 7 },
  { name: "GitHub", icon: GitPullRequest, count: 10 },
  { name: "Terminal", icon: Hammer, count: 6 },
  { name: "Docker", icon: Boxes, count: 4 },
  { name: "Browser", icon: Globe2, count: 3 },
  { name: "MCP", icon: Network, count: 12 },
  { name: "Database", icon: Database, count: 5 },
  { name: "Security", icon: ShieldCheck, count: 5 }
];

export const commandPaletteItems = [
  { label: "Open local folder", icon: Code2, section: "Workspace" },
  { label: "Clone GitHub repository", icon: GitBranch, section: "GitHub" },
  { label: "Run planner workflow", icon: Workflow, section: "Agents" },
  { label: "Start sandbox terminal", icon: Cloud, section: "Cloud" },
  { label: "Generate database schema", icon: Database, section: "Database" },
  { label: "Run security review", icon: LockKeyhole, section: "Security" },
  { label: "Debug failing tests", icon: Bug, section: "Testing" },
  { label: "Deploy Docker image", icon: Rocket, section: "Deploy" },
  { label: "Configure Ollama models", icon: BrainCircuit, section: "Models" },
  { label: "Run Vitest suite", icon: TestTube2, section: "Testing" },
  { label: "Ask Coder agent", icon: Bot, section: "Chat" }
];
