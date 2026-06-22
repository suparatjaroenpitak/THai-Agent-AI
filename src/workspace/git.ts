import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const allowedGitCommands = new Set([
  "status",
  "log",
  "diff",
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

export async function runGit(args: string[], cwd: string) {
  const [command] = args;
  if (!command || !allowedGitCommands.has(command)) {
    throw new Error(`Unsupported git command: ${command ?? "(empty)"}`);
  }

  const { stdout, stderr } = await execFileAsync("git", args, {
    cwd,
    timeout: 60_000,
    maxBuffer: 1024 * 1024 * 8
  });

  return {
    stdout,
    stderr,
    command: `git ${args.join(" ")}`
  };
}
