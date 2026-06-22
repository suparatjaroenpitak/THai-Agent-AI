import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveWorkspacePath } from "@/workspace/server-project";

const execFileAsync = promisify(execFile);

const allowedGitCommands = new Set([
  "status",
  "log",
  "diff",
  "init",
  "branch",
  "checkout",
  "switch",
  "pull",
  "push",
  "commit",
  "add",
  "merge",
  "clone",
  "remote",
  "show",
  "fetch"
]);

export async function runGit(args: string[], workspaceId = "current-workspace", cwd = "") {
  const [command] = args;
  if (!command || !allowedGitCommands.has(command)) {
    throw new Error(`Unsupported git command: ${command ?? "(empty)"}`);
  }

  const workingDirectory = await resolveWorkspacePath(workspaceId, cwd);
  const { stdout, stderr } = await execFileAsync("git", args, {
    cwd: workingDirectory,
    timeout: 60_000,
    maxBuffer: 1024 * 1024 * 8
  });

  return {
    stdout,
    stderr,
    cwd: workingDirectory,
    command: `git ${args.join(" ")}`
  };
}
