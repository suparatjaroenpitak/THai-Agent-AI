# OpenCodex Architecture

OpenCodex is a browser-first AI coding agent built on Bun, Next.js App Router, React, TypeScript, TailwindCSS, shadcn/ui, Better Auth, Drizzle ORM, PostgreSQL, Redis, Monaco Editor, xterm.js, WebSocket, Docker, Cloudflare R2, Git, Node Worker, LangGraph, MCP Protocol, and OpenTelemetry.

```mermaid
flowchart TD
  User["User in Browser"] --> UI["Next.js App Router UI"]
  UI --> Auth["Better Auth"]
  UI --> API["Route Handlers"]
  UI --> WS["Bun WebSocket Server"]
  API --> Router["Auto Model Router"]
  API --> Graph["LangGraph Agent Workflow"]
  API --> Tools["Tool Gateway"]
  API --> DB["PostgreSQL + Drizzle"]
  API --> Redis["Redis Queue / PubSub"]
  Graph --> Planner["Planner"]
  Planner --> Research["Research"]
  Research --> Architect["Architect"]
  Architect --> Coder["Coder"]
  Coder --> Review["Review"]
  Review --> Test["Test"]
  Test --> Fix["Fix"]
  Fix --> Coder
  Test --> Commit["Commit / PR"]
  Tools --> Git["Git"]
  Tools --> Terminal["Sandbox Terminal"]
  Tools --> Docker["Docker Sandbox"]
  Tools --> MCP["MCP Connectors"]
  Tools --> R2["Cloudflare R2"]
  Redis --> Worker["Bun Node Worker"]
  Worker --> WS
```

## Runtime Layers

- UI: VS Code-style browser workspace with Monaco, xterm.js, resizable panels, command palette, chat, model routing, and workflow state.
- API: Next.js Route Handlers for auth, agents, providers, workspace indexing, RAG, tasks, MCP, git, and terminal queueing.
- Worker: Bun process that consumes Redis events, runs LangGraph workflows, and publishes live events to WebSocket subscribers.
- Data: PostgreSQL stores users, sessions, credentials, workspaces, code index, memory, conversations, tasks, tool calls, deployments, and audit logs.
- Sandbox: Docker/Linux workspace with persistent storage for cloud IDE execution.
- MCP: Catalog and schema for GitHub, Notion, Linear, Slack, Discord, Google Drive, Figma, Jira, Confluence, Postgres, Redis, S3, and Cloudflare connectors.

## Request Flow

```mermaid
sequenceDiagram
  participant U as User
  participant UI as Browser UI
  participant API as Next.js API
  participant R as Model Router
  participant G as LangGraph
  participant Q as Redis
  participant W as Worker
  participant S as WebSocket

  U->>UI: Prompt / command
  UI->>API: POST /api/agent
  API->>R: Choose cheapest compatible model
  API->>Q: Publish workflow event
  API->>G: Run immediate planning graph
  Q->>W: Deliver queued workflow
  W->>G: Run full agent workflow
  W->>S: Publish progress events
  S->>UI: Stream task state
```
