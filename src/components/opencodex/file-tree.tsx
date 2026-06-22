"use client";

import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { WorkspaceTreeNode } from "@/components/opencodex/types";

type FileTreeProps = {
  tree: WorkspaceTreeNode[];
  expandedFolders: Record<string, boolean>;
  selectedPath: string;
  loading?: boolean;
  onSelectFile: (path: string) => void;
  onToggleFolder: (path: string) => void;
};

function NodeRow({
  node,
  depth = 0,
  expandedFolders,
  selectedPath,
  onSelectFile,
  onToggleFolder
}: {
  node: WorkspaceTreeNode;
  depth?: number;
} & Omit<FileTreeProps, "tree" | "loading">) {
  const isFolder = node.kind === "directory";
  const isOpen = isFolder ? expandedFolders[node.path] ?? depth < 2 : false;
  const isSelected = !isFolder && selectedPath === node.path;
  const FolderIcon = isOpen ? FolderOpen : Folder;

  return (
    <div>
      <button
        onClick={() => {
          if (isFolder) {
            onToggleFolder(node.path);
            return;
          }

          onSelectFile(node.path);
        }}
        className={`flex h-7 w-full min-w-0 items-center gap-1.5 rounded-sm px-2 text-left text-xs transition-colors ${
          isSelected ? "bg-emerald-400/10 text-emerald-200" : "text-zinc-300 hover:bg-white/[0.06]"
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {isFolder ? (
          isOpen ? <ChevronDown className="size-3 text-zinc-500" /> : <ChevronRight className="size-3 text-zinc-500" />
        ) : (
          <span className="w-3" />
        )}
        {isFolder ? (
          <FolderIcon className="size-3.5 shrink-0 text-amber-300" />
        ) : (
          <File className="size-3.5 shrink-0 text-sky-300" />
        )}
        <span className="truncate">{node.name}</span>
        {node.path.endsWith("route.ts") ? (
          <Badge variant="info" className="ml-auto h-5 px-1.5 py-0 text-[10px]">
            API
          </Badge>
        ) : null}
      </button>
      {isFolder && isOpen && node.children
        ? node.children.map((child) => (
            <NodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              onToggleFolder={onToggleFolder}
            />
          ))
        : null}
    </div>
  );
}

export function FileTree({ tree, expandedFolders, selectedPath, loading, onSelectFile, onToggleFolder }: FileTreeProps) {
  return (
    <div className="h-full overflow-auto px-1 py-2 scrollbar-thin">
      {loading ? <div className="px-2 py-3 text-xs text-zinc-500">Loading workspace</div> : null}
      {!loading && tree.length === 0 ? <div className="px-2 py-3 text-xs text-zinc-500">No files found</div> : null}
      {tree.map((node) => (
        <NodeRow
          key={node.path}
          node={node}
          expandedFolders={expandedFolders}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
          onToggleFolder={onToggleFolder}
        />
      ))}
    </div>
  );
}
