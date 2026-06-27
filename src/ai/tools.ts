import { z } from "zod";
import { readWorkspaceFile, saveWorkspaceFile, resolveWorkspacePath } from "@/workspace/server-project";
import { runTerminalCommand } from "@/workspace/terminal";
import { runGit } from "@/workspace/git";
import { execFile } from "node:child_process";
import { unlink, rename as fsRename } from "node:fs/promises";
import { promisify } from "node:util";
import type { OllamaToolDefinition, OllamaToolCall } from "@/ai/model-client";

const execFileAsync = promisify(execFile);

// ── Zod Schemas (input validation) ────────────────────────────────────────────

export const toolInputSchemas = {
  readFile: z.object({ workspaceId: z.string(), path: z.string() }),
  writeFile: z.object({ workspaceId: z.string(), path: z.string(), content: z.string() }),
  deleteFile: z.object({ workspaceId: z.string(), path: z.string() }),
  rename: z.object({ workspaceId: z.string(), from: z.string(), to: z.string() }),
  search: z.object({ workspaceId: z.string(), query: z.string(), regex: z.boolean().default(false) }),
  git: z.object({ workspaceId: z.string(), args: z.array(z.string()) }),
  terminal: z.object({ workspaceId: z.string(), command: z.string(), cwd: z.string().optional() }),
  docker: z.object({ workspaceId: z.string(), args: z.array(z.string()) }),
  webSearch: z.object({ query: z.string(), recencyDays: z.number().optional() }),
  memory: z.object({ scope: z.enum(["short", "long", "project", "user", "conversation"]), content: z.string() }),
  browser: z.object({ url: z.string().url(), action: z.enum(["open", "click", "type", "screenshot"]) }),
  sql: z.object({ workspaceId: z.string(), statement: z.string() }),
  http: z.object({ method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]), url: z.string().url(), body: z.unknown().optional() })
};

export type ToolName = keyof typeof toolInputSchemas;

export const agentToolCatalog = Object.keys(toolInputSchemas).map((name) => ({
  name,
  approvalRequired: ["writeFile", "deleteFile", "rename", "git", "terminal", "docker", "sql"].includes(name)
}));

// ── Ollama Tool Definitions ───────────────────────────────────────────────────

export const toolDefinitions: OllamaToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "readFile",
      description: "Read a file from the workspace. Returns file content, language, and metadata.",
      parameters: {
        type: "object",
        properties: {
          workspaceId: { type: "string", description: "Workspace ID (default: current-workspace)" },
          path: { type: "string", description: "File path relative to workspace root" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "writeFile",
      description: "Write or overwrite a file in the workspace. Creates parent directories if needed.",
      parameters: {
        type: "object",
        properties: {
          workspaceId: { type: "string", description: "Workspace ID (default: current-workspace)" },
          path: { type: "string", description: "File path relative to workspace root" },
          content: { type: "string", description: "File content to write" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteFile",
      description: "Delete a file from the workspace.",
      parameters: {
        type: "object",
        properties: {
          workspaceId: { type: "string", description: "Workspace ID (default: current-workspace)" },
          path: { type: "string", description: "File path relative to workspace root" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rename",
      description: "Rename or move a file within the workspace.",
      parameters: {
        type: "object",
        properties: {
          workspaceId: { type: "string", description: "Workspace ID (default: current-workspace)" },
          from: { type: "string", description: "Source path" },
          to: { type: "string", description: "Destination path" },
        },
        required: ["from", "to"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search",
      description: "Search for a pattern in workspace files using regex or plain text.",
      parameters: {
        type: "object",
        properties: {
          workspaceId: { type: "string", description: "Workspace ID" },
          query: { type: "string", description: "Search query (literal or regex)" },
          regex: { type: "boolean", description: "Treat query as regex (default: false)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git",
      description: "Run a git command in the workspace (allowed: status, log, diff, init, branch, checkout, switch, pull, push, commit, add, merge, clone, remote, show, fetch).",
      parameters: {
        type: "object",
        properties: {
          workspaceId: { type: "string", description: "Workspace ID" },
          args: { type: "array", items: { type: "string" }, description: "Git arguments (e.g. ['status'])" },
        },
        required: ["args"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "terminal",
      description: "Run a shell command in the workspace directory. 120s timeout. 10MB output limit.",
      parameters: {
        type: "object",
        properties: {
          workspaceId: { type: "string", description: "Workspace ID" },
          command: { type: "string", description: "Shell command to execute" },
          cwd: { type: "string", description: "Working directory relative to workspace root (optional)" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "webSearch",
      description: "Search the web for current information. Returns text snippets from relevant pages.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          recencyDays: { type: "number", description: "Only return results from last N days (optional)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "memory",
      description: "Store a note in the agent's memory for later reference across the session.",
      parameters: {
        type: "object",
        properties: {
          scope: { type: "string", enum: ["short", "long", "project", "user", "conversation"], description: "Memory scope" },
          content: { type: "string", description: "Content to remember" },
        },
        required: ["scope", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "http",
      description: "Make an HTTP request to an external API or service.",
      parameters: {
        type: "object",
        properties: {
          method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"], description: "HTTP method" },
          url: { type: "string", description: "Request URL" },
          body: { type: "object", description: "JSON request body (optional)" },
        },
        required: ["method", "url"],
      },
    },
  },
];

// ── Tool Execution ────────────────────────────────────────────────────────────

export type ToolResult = {
  tool: string;
  success: boolean;
  output: string;
  durationMs: number;
};

const memoryStore: Record<string, string[]> = {
  short: [],
  long: [],
  project: [],
  user: [],
  conversation: [],
};

export async function executeTool(toolCall: OllamaToolCall, workspaceId = "current-workspace"): Promise<ToolResult> {
  const start = Date.now();
  const { name, arguments: args } = toolCall.function;
  const ws = (args.workspaceId as string) || workspaceId;

  try {
    switch (name) {
      case "readFile": {
        const path = args.path as string;
        const file = await readWorkspaceFile(path, ws);
        return { tool: name, success: true, output: `File: ${file.path}\nLanguage: ${file.language}\nSize: ${file.size} bytes\n\n${file.content}`, durationMs: Date.now() - start };
      }

      case "writeFile": {
        const path = args.path as string;
        const content = args.content as string;
        const result = await saveWorkspaceFile(path, content, ws);
        return { tool: name, success: true, output: `Written ${result.size} bytes to ${result.path}`, durationMs: Date.now() - start };
      }

      case "deleteFile": {
        const path = args.path as string;
        const absPath = await resolveWorkspacePath(ws, path);
        await unlink(absPath);
        return { tool: name, success: true, output: `Deleted ${path}`, durationMs: Date.now() - start };
      }

      case "rename": {
        const from = args.from as string;
        const to = args.to as string;
        const absFrom = await resolveWorkspacePath(ws, from);
        const absTo = await resolveWorkspacePath(ws, to);
        await fsRename(absFrom, absTo);
        return { tool: name, success: true, output: `Renamed ${from} → ${to}`, durationMs: Date.now() - start };
      }

      case "search": {
        const query = args.query as string;
        const useRegex = (args.regex as boolean) ?? false;
        const { execSync } = await import("node:child_process");
        const wsPath = (await resolveWorkspacePath(ws, "")).replace(/\\/g, "/");
        let result: string;
        if (process.platform === "win32") {
          result = execSync(
            `powershell -Command "Get-ChildItem -Recurse -File | Select-String -Pattern '${query.replace(/'/g, "''")}' | Select-Object -First 50"`,
            { cwd: wsPath, encoding: "utf8", maxBuffer: 1024 * 1024 }
          );
        } else {
          const grepCmd = useRegex ? `grep -rn --include='*' -E '${query}' .` : `grep -rn --include='*' -F '${query}' .`;
          result = execSync(grepCmd, { cwd: wsPath, encoding: "utf8", maxBuffer: 1024 * 1024 });
        }
        const lines = result.split("\n").filter(Boolean).slice(0, 100);
        return { tool: name, success: true, output: lines.length ? lines.join("\n") : "No matches found", durationMs: Date.now() - start };
      }

      case "git": {
        const gitArgs = args.args as string[];
        const result = await runGit(gitArgs, ws);
        const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
        return { tool: name, success: result.exitCode === 0, output: output || "(empty output)", durationMs: Date.now() - start };
      }

      case "terminal": {
        const command = args.command as string;
        const cwd = args.cwd as string | undefined;
        const result = await runTerminalCommand({ workspaceId: ws, command, cwd });
        const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
        return { tool: name, success: result.exitCode === 0, output: output || "(empty output)", durationMs: Date.now() - start };
      }

      case "docker": {
        const dockerArgs = args.args as string[];
        const { stdout, stderr } = await execFileAsync("docker", dockerArgs, { timeout: 120_000, maxBuffer: 1024 * 1024 * 10 });
        const output = [stdout, stderr].filter(Boolean).join("\n").trim();
        return { tool: name, success: true, output: output || "(empty output)", durationMs: Date.now() - start };
      }

      case "webSearch": {
        const query = args.query as string;
        try {
          const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
          const response = await fetch(searchUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; OpenCodexAgent/1.0)" },
            signal: AbortSignal.timeout(15000),
          });
          const html = await response.text();
          const snippets = html.match(/class="result__snippet">(.*?)<\/a>/gs)?.slice(0, 10) ?? [];
          const results = snippets.map((s: string) => s.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
          return { tool: name, success: true, output: results.length ? results.join("\n---\n") : "No search results found", durationMs: Date.now() - start };
        } catch {
          return { tool: name, success: true, output: `Web search unavailable for: ${query}`, durationMs: Date.now() - start };
        }
      }

      case "memory": {
        const scope = args.scope as string;
        const content = args.content as string;
        if (memoryStore[scope]) {
          memoryStore[scope].push(content);
        }
        return { tool: name, success: true, output: `Stored in ${scope} memory: ${content.slice(0, 200)}`, durationMs: Date.now() - start };
      }

      case "http": {
        const method = args.method as string;
        const url = args.url as string;
        const body = args.body as Record<string, unknown> | undefined;
        const response = await fetch(url, {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(30000),
        });
        const text = await response.text();
        const output = text.length > 5000 ? text.slice(0, 5000) + `\n[Truncated ${text.length - 5000} more chars]` : text;
        return { tool: name, success: response.ok, output: `HTTP ${response.status}:\n${output}`, durationMs: Date.now() - start };
      }

      case "browser":
      case "sql":
        return { tool: name, success: false, output: `Tool '${name}' is not yet implemented in server-side agent mode`, durationMs: Date.now() - start };

      default:
        return { tool: name, success: false, output: `Unknown tool: ${name}`, durationMs: Date.now() - start };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { tool: name, success: false, output: `Error: ${message}`, durationMs: Date.now() - start };
  }
}
