import { z } from "zod";

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
