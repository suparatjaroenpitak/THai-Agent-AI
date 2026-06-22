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
  | "Security"
  | "DevOps"
  | "Database";

export const agentWorkflow: Array<{
  role: AgentRole;
  status: "done" | "active" | "queued";
  detail: string;
}> = [
  { role: "Planner", status: "done", detail: "Scope split into 9 execution tracks" },
  { role: "Research", status: "done", detail: "Docs and package graph indexed" },
  { role: "Architect", status: "active", detail: "Choosing sandbox and storage plan" },
  { role: "Coder", status: "queued", detail: "Waiting for file plan approval" },
  { role: "Reviewer", status: "queued", detail: "Static risk review" },
  { role: "Tester", status: "queued", detail: "Vitest and Playwright queue" },
  { role: "Security", status: "queued", detail: "Secrets and OWASP scan" },
  { role: "Database", status: "queued", detail: "Migration diff pending" },
  { role: "DevOps", status: "queued", detail: "Docker deploy recipe pending" }
];

export const supportedProviderGroups = [
  {
    name: "Coding",
    models: ["DeepSeek V3", "Qwen Coder", "Kimi K2", "OpenAI Compatible"]
  },
  {
    name: "Reasoning",
    models: ["DeepSeek R1", "Qwen3", "GLM-4", "OpenRouter"]
  },
  {
    name: "Regional",
    models: ["Moonshot", "MiniMax", "Doubao", "Zhipu", "DashScope", "SiliconFlow"]
  },
  {
    name: "Open",
    models: ["InternLM", "Yi", "Baichuan", "Together AI", "Groq"]
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

export async function runOpenCodexWorkflow(input: AgentInput) {
  const graph = new StateGraph(AgentState)
    .addNode("planner", plannerAgent)
    .addNode("research", researchAgent)
    .addNode("architect", architectAgent)
    .addNode("coder", coderAgent)
    .addNode("review", reviewerAgent)
    .addNode("test", testerAgent)
    .addNode("fix", debuggerAgent)
    .addNode("commit", gitAgent)
    .addEdge(START, "planner")
    .addEdge("planner", "research")
    .addEdge("research", "architect")
    .addEdge("architect", "coder")
    .addConditionalEdges("coder", shouldReviewOrFix)
    .addEdge("review", "test")
    .addConditionalEdges("test", shouldCommitOrFix)
    .addEdge("fix", "coder")
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

export async function POST(request: Request) {
  const body = await request.json();

  return NextResponse.json({
    message: "Workflow queued for " + (body.prompt ?? "untitled task")
  });
}`;

const workerCode = `export async function runNodeWorker() {
  console.log("worker online");
}`;

const websocketCode = `import { createServer } from "node:http";

const server = createServer();

server.listen(3001, () => {
  console.log("socket server listening on :3001");
});`;

const dockerComposeCode = `services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"`;

const readmeCode = `# OpenCodex

Browser-native AI coding agent with workspaces, model routing, MCP, and task execution.

## Local Development

1. bun install
2. bun run db:generate
3. bun run dev`;

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
  { label: "Add OpenAI-compatible API", icon: BrainCircuit, section: "Models" },
  { label: "Run Vitest suite", icon: TestTube2, section: "Testing" },
  { label: "Ask Coder agent", icon: Bot, section: "Chat" }
];
