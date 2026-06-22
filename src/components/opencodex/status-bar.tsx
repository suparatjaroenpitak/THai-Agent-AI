"use client";

import { CheckCircle2, GitBranch, Radio, ShieldCheck } from "lucide-react";

export function StatusBar() {
  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-white/10 bg-[#101214] px-2 text-[11px] text-zinc-400">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex items-center gap-1 truncate">
          <GitBranch className="size-3" />
          main
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <CheckCircle2 className="size-3 text-emerald-300" />
          0 problems
        </span>
        <span className="hidden items-center gap-1 md:flex">
          <ShieldCheck className="size-3 text-amber-300" />
          secrets clean
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span>TypeScript</span>
        <span className="flex items-center gap-1">
          <Radio className="size-3 text-emerald-300" />
          worker online
        </span>
      </div>
    </footer>
  );
}
