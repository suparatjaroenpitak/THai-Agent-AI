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

export const fileTree = [
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
] as const;

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
