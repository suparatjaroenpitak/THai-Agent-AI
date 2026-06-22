export type LocalFileEntry = {
  path: string;
  kind: "file" | "directory";
  size?: number;
  lastModified?: number;
};

export async function scanBrowserDirectory(
  root: OpenCodexDirectoryHandle,
  options: { maxFiles?: number; maxDepth?: number } = {}
) {
  const maxFiles = options.maxFiles ?? 5000;
  const maxDepth = options.maxDepth ?? 8;
  const entries: LocalFileEntry[] = [];

  async function visit(directory: OpenCodexDirectoryHandle, prefix: string, depth: number) {
    if (entries.length >= maxFiles || depth > maxDepth) return;

    for await (const [, handle] of directory.entries()) {
      const path = prefix ? `${prefix}/${handle.name}` : handle.name;
      if (handle.kind === "directory") {
        entries.push({ path, kind: "directory" });
        await visit(handle, path, depth + 1);
      } else {
        const file = await handle.getFile();
        entries.push({
          path,
          kind: "file",
          size: file.size,
          lastModified: file.lastModified
        });
      }
      if (entries.length >= maxFiles) break;
    }
  }

  await visit(root, "", 0);
  return entries;
}
