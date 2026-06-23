"use client";

import { ChevronDown, ChevronRight, File, Folder, FolderOpen, Plus, FolderPlus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { WorkspaceTreeNode } from "@/components/opencodex/types";

type FileTreeProps = {
  tree: WorkspaceTreeNode[];
  expandedFolders: Record<string, boolean>;
  selectedPath: string;
  loading?: boolean;
  onSelectFile: (path: string) => void;
  onToggleFolder: (path: string) => void;
  onCreateFile?: (parentPath: string) => void;
  onCreateFolder?: (parentPath: string) => void;
  onDeleteNode?: (path: string) => void;
};

function NodeRow({
  node,
  depth = 0,
  expandedFolders,
  selectedPath,
  onSelectFile,
  onToggleFolder,
  onCreateFile,
  onCreateFolder,
  onDeleteNode
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
      <div 
        className={`group flex h-7 w-full min-w-0 items-center gap-1.5 rounded-sm px-2 text-left text-xs transition-colors ${
          isSelected ? "bg-emerald-400/10 text-emerald-200" : "text-zinc-300 hover:bg-white/[0.06]"
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <button
          onClick={() => {
            if (isFolder) {
              onToggleFolder(node.path);
              return;
            }
            onSelectFile(node.path);
          }}
          className="flex flex-1 items-center gap-1.5 min-w-0"
        >
          {isFolder ? (
            isOpen ? <ChevronDown className="size-3 text-zinc-500 shrink-0" /> : <ChevronRight className="size-3 text-zinc-500 shrink-0" />
          ) : (
            <span className="w-3 shrink-0" />
          )}
          {isFolder ? (
            <FolderIcon className="size-3.5 shrink-0 text-amber-300" />
          ) : (
            <File className="size-3.5 shrink-0 text-sky-300" />
          )}
          <span className="truncate">{node.name}</span>
          {node.path.endsWith("route.ts") ? (
            <Badge variant="info" className="ml-2 h-5 px-1.5 py-0 text-[10px] shrink-0">
              API
            </Badge>
          ) : null}
        </button>

        <div className="hidden items-center group-hover:flex bg-[#252526] pl-1 rounded-sm">
          {isFolder && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); onCreateFile?.(node.path); }}
                className="p-1 hover:bg-white/10 rounded-sm text-zinc-400 hover:text-zinc-100"
                title="New File"
              >
                <Plus className="size-3" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onCreateFolder?.(node.path); }}
                className="p-1 hover:bg-white/10 rounded-sm text-zinc-400 hover:text-zinc-100"
                title="New Folder"
              >
                <FolderPlus className="size-3" />
              </button>
            </>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onDeleteNode?.(node.path); }}
            className="p-1 hover:bg-white/10 rounded-sm text-zinc-400 hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
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
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onDeleteNode={onDeleteNode}
            />
          ))
        : null}
    </div>
  );
}

export function FileTree({ tree, expandedFolders, selectedPath, loading, onSelectFile, onToggleFolder, onCreateFile, onCreateFolder, onDeleteNode }: FileTreeProps) {
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
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
          onDeleteNode={onDeleteNode}
        />
      ))}
    </div>
  );
}
