"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, File, Folder, FolderOpen, Plus, FolderPlus, Trash2, Edit2, Copy, FilePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
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
  onRenameNode?: (oldPath: string, newName: string) => void;
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
  onDeleteNode,
  onRenameNode,
  renamingPath,
  setRenamingPath
}: {
  node: WorkspaceTreeNode;
  depth?: number;
  renamingPath: string | null;
  setRenamingPath: (path: string | null) => void;
} & Omit<FileTreeProps, "tree" | "loading">) {
  const isFolder = node.kind === "directory";
  const isOpen = isFolder ? expandedFolders[node.path] ?? depth < 2 : false;
  const isSelected = !isFolder && selectedPath === node.path;
  const FolderIcon = isOpen ? FolderOpen : Folder;
  const isRenaming = renamingPath === node.path;
  const [renameValue, setRenameValue] = useState(node.name);

  function handleRenameSubmit() {
    if (renameValue.trim() && renameValue !== node.name) {
      onRenameNode?.(node.path, renameValue.trim());
    }
    setRenamingPath(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleRenameSubmit();
    if (e.key === "Escape") setRenamingPath(null);
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div 
            className={`group flex h-7 w-full min-w-0 items-center gap-1.5 rounded-sm px-2 text-left text-xs transition-colors ${
              isSelected ? "bg-emerald-400/10 text-emerald-200" : "text-zinc-300 hover:bg-white/[0.06]"
            } ${isRenaming ? "bg-white/10" : ""}`}
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
              
              {isRenaming ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-black/40 border border-emerald-500/50 text-emerald-100 outline-none px-1 rounded-sm -ml-1 h-5"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate">{node.name}</span>
              )}
              
              {!isRenaming && node.path.endsWith("route.ts") ? (
                <Badge variant="info" className="ml-2 h-5 px-1.5 py-0 text-[10px] shrink-0">
                  API
                </Badge>
              ) : null}
            </button>

            {!isRenaming && (
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
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setRenameValue(node.name);
                    setRenamingPath(node.path); 
                  }}
                  className="p-1 hover:bg-white/10 rounded-sm text-zinc-400 hover:text-sky-300"
                  title="Rename"
                >
                  <Edit2 className="size-3" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteNode?.(node.path); }}
                  className="p-1 hover:bg-white/10 rounded-sm text-zinc-400 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48 bg-[#1e1e1e] border-white/10 shadow-command">
          {isFolder && (
            <>
              <ContextMenuItem onClick={() => onCreateFile?.(node.path)} className="gap-2 cursor-pointer focus:bg-emerald-500/20 focus:text-emerald-300">
                <FilePlus className="size-4" /> New File
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onCreateFolder?.(node.path)} className="gap-2 cursor-pointer focus:bg-emerald-500/20 focus:text-emerald-300">
                <FolderPlus className="size-4" /> New Folder
              </ContextMenuItem>
              <ContextMenuSeparator className="bg-white/10" />
            </>
          )}
          <ContextMenuItem 
            onClick={() => {
              setRenameValue(node.name);
              setRenamingPath(node.path);
            }} 
            className="gap-2 cursor-pointer focus:bg-sky-500/20 focus:text-sky-300"
          >
            <Edit2 className="size-4" /> Rename
          </ContextMenuItem>
          <ContextMenuItem 
            onClick={() => navigator.clipboard.writeText(node.path)}
            className="gap-2 cursor-pointer focus:bg-white/10"
          >
            <Copy className="size-4" /> Copy Relative Path
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-white/10" />
          <ContextMenuItem 
            onClick={() => onDeleteNode?.(node.path)} 
            className="gap-2 cursor-pointer text-red-400 focus:bg-red-500/20 focus:text-red-300"
          >
            <Trash2 className="size-4" /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

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
              onRenameNode={onRenameNode}
              renamingPath={renamingPath}
              setRenamingPath={setRenamingPath}
            />
          ))
        : null}
    </div>
  );
}

export function FileTree({ tree, expandedFolders, selectedPath, loading, onSelectFile, onToggleFolder, onCreateFile, onCreateFolder, onDeleteNode, onRenameNode }: FileTreeProps) {
  const [renamingPath, setRenamingPath] = useState<string | null>(null);

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block h-full min-h-[100px]">
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
              onRenameNode={onRenameNode}
              renamingPath={renamingPath}
              setRenamingPath={setRenamingPath}
            />
          ))}
        </div>
      </ContextMenuTrigger>
      
      {/* Root Background Context Menu (Outside of nodes) */}
      <ContextMenuContent className="w-48 bg-[#1e1e1e] border-white/10 shadow-command">
        <ContextMenuItem onClick={() => onCreateFile?.("")} className="gap-2 cursor-pointer focus:bg-emerald-500/20 focus:text-emerald-300">
          <FilePlus className="size-4" /> New File
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onCreateFolder?.("")} className="gap-2 cursor-pointer focus:bg-emerald-500/20 focus:text-emerald-300">
          <FolderPlus className="size-4" /> New Folder
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
