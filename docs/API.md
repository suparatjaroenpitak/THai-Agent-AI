# API Surface

All APIs are Next.js App Router route handlers running on the Node.js runtime.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/auth/[...all]` | GET/POST | Better Auth session, email/password, and GitHub OAuth |
| `/api/health` | GET | Service health, provider count, MCP count |
| `/api/providers` | GET | Model catalog and auto-routing decision |
| `/api/agent` | POST | Queue and run Planner -> Research -> Architect -> Coder -> Review -> Test -> Fix -> Commit |
| `/api/workspaces` | GET/POST | List or create local, desktop-agent, GitHub, or cloud workspaces |
| `/api/workspaces/index` | POST | Index files, symbols, imports, exports, chunks, and RAG context |
| `/api/tasks` | GET/POST | Task queue, progress, retry/cancel/resume foundation |
| `/api/mcp/servers` | GET | Supported MCP connector catalog |
| `/api/tools/git` | POST | Git command gateway for clone, commit, push, pull, PR preparation |
| `/api/tools/terminal` | POST | Queue terminal commands for sandbox execution |
| `/api/rag` | POST | Chunk and rank README, docs, wiki, PDF text, markdown, API docs, and source context |
| `/api/admin/metrics` | GET | Admin metrics for users, billing, workers, logs, providers, and analytics |

## Agent Request

```json
{
  "workspaceId": "demo-workspace",
  "prompt": "Fix failing tests and create a PR",
  "mode": "auto"
}
```

## Terminal Request

```json
{
  "workspaceId": "demo-workspace",
  "command": "bun test",
  "cwd": "/workspace"
}
```
