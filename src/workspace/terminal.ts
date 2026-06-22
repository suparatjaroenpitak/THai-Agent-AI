import { exec } from "node:child_process";
import { promisify } from "node:util";
import { resolveWorkspacePath } from "@/workspace/server-project";

const execAsync = promisify(exec);

export async function runTerminalCommand({
  workspaceId,
  command,
  cwd
}: {
  workspaceId: string;
  command: string;
  cwd?: string;
}) {
  const workingDirectory = await resolveWorkspacePath(workspaceId, cwd ?? "");
  const startedAt = Date.now();

  const { stdout, stderr } = await execAsync(command, {
    cwd: workingDirectory,
    timeout: 120_000,
    maxBuffer: 1024 * 1024 * 10,
    windowsHide: true
  });

  return {
    command,
    cwd: workingDirectory,
    stdout,
    stderr,
    durationMs: Date.now() - startedAt
  };
}
