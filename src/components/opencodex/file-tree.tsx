"use client";

import { ChevronDown, File, Folder, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fileTree } from "@/components/opencodex/data";

type FileNode = (typeof fileTree)[number] | NonNullable<(typeof fileTree)[number]["children"]>[number];

function NodeRow({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const isFolder = node.type === "folder";

  return (
    <div>
      <button
        className="flex h-7 w-full min-w-0 items-center gap-1.5 rounded-sm px-2 text-left text-xs text-zinc-300 hover:bg-white/[0.06]"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {isFolder ? <ChevronDown className="size-3 text-zinc-500" /> : <span className="w-3" />}
        {isFolder ? (
          depth === 0 ? (
            <FolderOpen className="size-3.5 shrink-0 text-amber-300" />
          ) : (
            <Folder className="size-3.5 shrink-0 text-amber-300" />
          )
        ) : (
          <File className="size-3.5 shrink-0 text-sky-300" />
        )}
        <span className="truncate">{node.name}</span>
        {"badge" in node && node.badge ? (
          <Badge variant="info" className="ml-auto h-5 px-1.5 py-0 text-[10px]">
            {node.badge}
          </Badge>
        ) : null}
      </button>
      {isFolder && "children" in node
        ? node.children.map((child) => <NodeRow key={child.name} node={child} depth={depth + 1} />)
        : null}
    </div>
  );
}

export function FileTree() {
  return (
    <div className="h-full overflow-auto px-1 py-2 scrollbar-thin">
      {fileTree.map((node) => (
        <NodeRow key={node.name} node={node} />
      ))}
    </div>
  );
}
