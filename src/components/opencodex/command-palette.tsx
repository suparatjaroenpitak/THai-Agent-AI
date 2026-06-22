"use client";

import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { commandPaletteItems } from "@/components/opencodex/data";

export function CommandPalette({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-white/10 bg-[#17191b] p-0 text-zinc-100">
        <DialogHeader className="border-b border-white/10 px-4 py-3">
          <DialogTitle className="text-sm">Command Palette</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Search className="size-4 text-zinc-500" />
          <Input
            autoFocus
            className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
            placeholder="Search commands"
          />
        </div>
        <div className="max-h-[420px] overflow-auto p-2 scrollbar-thin">
          {commandPaletteItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm hover:bg-white/[0.06]"
              >
                <Icon className="size-4 text-emerald-300" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="text-xs text-zinc-500">{item.section}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
