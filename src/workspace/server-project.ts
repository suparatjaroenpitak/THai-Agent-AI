import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { detectLanguage } from "@/ai/code-index";

const execFileAsync = promisify(execFile);

export type WorkspaceKind = "local" | "desktop_agent" | "github" | "cloud";

export type WorkspaceRecord = {
  id: string;
  name: string;
  kind: WorkspaceKind;
  rootPath: string;
  repository?: string;
  branch?: string;
  status: "ready" | "cloning" | "missing";
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceTreeNode = {
  name: string;
  path: string;
  kind: "file" | "directory";
  children?: WorkspaceTreeNode[];
};

const ignoredNames = new Set([
  ".git",
  ".next",
  ".bun-cache",
  ".npm-cache",
  ".tmp",
  "node_modules",
  "dist",
  "build",
  "coverage"
]);

const workspaceRoot = process.cwd();
const agentStateDir = path.join(workspaceRoot, ".agents");
const clonedWorkspaceDir = path.join(agentStateDir, "workspaces");
const registryPath = path.join(agentStateDir, "workspaces.json");

function now() {
  return new Date().toISOString();
}

function hashValue(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 10);
}

function safeName(value: string) {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workspace";
}

function toWorkspacePath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "");
}

function defaultWorkspace(): WorkspaceRecord {
  const timestamp = now();

  return {
    id: "current-workspace",
    name: path.basename(workspaceRoot),
    kind: "local",
    rootPath: workspaceRoot,
    status: "ready",
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

async function ensureRegistryDir() {
  await mkdir(clonedWorkspaceDir, { recursive: true });
}

async function readRegistry() {
  try {
    const raw = await readFile(registryPath, "utf8");
    const parsed = JSON.parse(raw) as WorkspaceRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeRegistry(workspaces: WorkspaceRecord[]) {
  await ensureRegistryDir();
  await writeFile(registryPath, `${JSON.stringify(workspaces, null, 2)}\n`, "utf8");
}

async function pathExists(targetPath: string) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function upsertWorkspace(record: WorkspaceRecord) {
  const registry = await readRegistry();
  const existingIndex = registry.findIndex((workspace) => workspace.id === record.id || workspace.rootPath === record.rootPath);
  const next = existingIndex >= 0 ? registry.map((workspace, index) => (index === existingIndex ? record : workspace)) : [...registry, record];
  await writeRegistry(next);
  return record;
}

function normalizeRepositoryUrl(repository: string) {
  const trimmed = repository.trim();
  if (/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/i.test(trimmed)) {
    return trimmed.endsWith(".git") ? trimmed : `${trimmed}.git`;
  }

  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) {
    return `https://github.com/${trimmed}.git`;
  }

  throw new Error("Only GitHub HTTPS URLs or owner/repo names are supported.");
}

export async function listWorkspaces() {
  const registry = await readRegistry();
  const defaultRecord = defaultWorkspace();
  const unique = registry.filter((workspace) => workspace.rootPath !== defaultRecord.rootPath);

  return Promise.all(
    [defaultRecord, ...unique].map(async (workspace) => ({
      ...workspace,
      status: (await pathExists(workspace.rootPath)) ? workspace.status : ("missing" as const)
    }))
  );
}

export async function getWorkspace(workspaceId = "current-workspace") {
  if (workspaceId === "current-workspace") return defaultWorkspace();

  const registry = await readRegistry();
  const workspace = registry.find((entry) => entry.id === workspaceId);
  if (!workspace) throw new Error(`Workspace not found: ${workspaceId}`);
  if (!(await pathExists(workspace.rootPath))) {
    return { ...workspace, status: "missing" as const };
  }

  return workspace;
}

export function getWorkspaceInfo() {
  return defaultWorkspace();
}

export async function bindLocalWorkspace({
  name,
  rootPath
}: {
  name?: string;
  rootPath: string;
}) {
  const absolutePath = path.resolve(rootPath.trim());
  const fileStat = await stat(absolutePath);
  if (!fileStat.isDirectory()) throw new Error(`Not a directory: ${rootPath}`);

  const timestamp = now();
  return upsertWorkspace({
    id: `local-${hashValue(absolutePath)}`,
    name: name?.trim() || path.basename(absolutePath),
    kind: "local",
    rootPath: absolutePath,
    status: "ready",
    createdAt: timestamp,
    updatedAt: timestamp
  });
}

export async function cloneGithubWorkspace({
  repository,
  name
}: {
  repository: string;
  name?: string;
}) {
  const repositoryUrl = normalizeRepositoryUrl(repository);
  await ensureRegistryDir();

  const id = `github-${hashValue(repositoryUrl)}-${randomUUID().slice(0, 8)}`;
  const targetPath = path.join(clonedWorkspaceDir, `${safeName(name || repositoryUrl)}-${hashValue(id)}`);
  const timestamp = now();
  const workspace: WorkspaceRecord = {
    id,
    name: name?.trim() || safeName(repositoryUrl.replace(/\.git$/i, "")),
    kind: "github",
    rootPath: targetPath,
    repository: repositoryUrl,
    branch: "main",
    status: "cloning",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await upsertWorkspace(workspace);
  await execFileAsync("git", ["clone", "--depth", "1", repositoryUrl, targetPath], {
    cwd: clonedWorkspaceDir,
    timeout: 180_000,
    maxBuffer: 1024 * 1024 * 8
  });

  return upsertWorkspace({
    ...workspace,
    status: "ready",
    updatedAt: now()
  });
}

export async function resolveWorkspacePath(workspaceId: string, relativePath = "") {
  const workspace = await getWorkspace(workspaceId);
  if (workspace.status === "missing") throw new Error(`Workspace folder is missing: ${workspace.rootPath}`);

  const normalized = toWorkspacePath(relativePath);
  const absolutePath = path.resolve(workspace.rootPath, normalized);
  const relativeToRoot = path.relative(workspace.rootPath, absolutePath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(normalized)) {
    throw new Error(`Path is outside workspace: ${relativePath}`);
  }

  return absolutePath;
}

export async function listWorkspaceTree(workspaceId = "current-workspace", relativePath = "", depth = 0, maxDepth = 8): Promise<WorkspaceTreeNode[]> {
  const absolutePath = await resolveWorkspacePath(workspaceId, relativePath);
  const entries = await readdir(absolutePath, { withFileTypes: true });

  const visibleEntries = entries
    .filter((entry) => !ignoredNames.has(entry.name))
    .sort((left, right) => {
      if (left.isDirectory() !== right.isDirectory()) {
        return left.isDirectory() ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 600);

  return Promise.all(
    visibleEntries.map(async (entry) => {
      const entryPath = toWorkspacePath(relativePath ? `${relativePath}/${entry.name}` : entry.name);

      if (entry.isDirectory()) {
        return {
          name: entry.name,
          path: entryPath,
          kind: "directory" as const,
          children: depth >= maxDepth ? [] : await listWorkspaceTree(workspaceId, entryPath, depth + 1, maxDepth)
        };
      }

      return {
        name: entry.name,
        path: entryPath,
        kind: "file" as const
      };
    })
  );
}

export async function readWorkspaceFile(relativePath: string, workspaceId = "current-workspace") {
  const absolutePath = await resolveWorkspacePath(workspaceId, relativePath);
  const fileStat = await stat(absolutePath);

  if (!fileStat.isFile()) {
    throw new Error(`Not a file: ${relativePath}`);
  }

  if (fileStat.size > 1024 * 1024 * 2) {
    throw new Error(`File is too large to open in editor: ${relativePath}`);
  }

  return {
    path: toWorkspacePath(relativePath),
    language: detectLanguage(relativePath),
    content: await readFile(absolutePath, "utf8"),
    size: fileStat.size,
    updatedAt: fileStat.mtime.toISOString()
  };
}

export async function saveWorkspaceFile(relativePath: string, content: string, workspaceId = "current-workspace") {
  const absolutePath = await resolveWorkspacePath(workspaceId, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");

  const fileStat = await stat(absolutePath);

  return {
    path: toWorkspacePath(relativePath),
    language: detectLanguage(relativePath),
    content,
    size: fileStat.size,
    updatedAt: fileStat.mtime.toISOString()
  };
}

export async function collectWorkspaceContext(workspaceId = "current-workspace", activePath?: string) {
  const workspace = await getWorkspace(workspaceId);
    const candidateFiles = [
      "README.md", 
      "package.json", 
      "components.json",
      "tailwind.config.ts", 
      "tsconfig.json", 
      "src/app/page.tsx", 
      activePath
    ].filter(Boolean) as string[];
  const seen = new Set<string>();
  const files = [];

  for (const filePath of candidateFiles) {
    if (seen.has(filePath)) continue;
    seen.add(filePath);

    try {
      const file = await readWorkspaceFile(filePath, workspaceId);
      files.push({
        path: file.path,
        content: file.content.slice(0, 12000)
      });
    } catch {
      // Optional context files are skipped when they do not exist in the selected workspace.
    }
  }

  return {
    workspace,
    files
  };
}
