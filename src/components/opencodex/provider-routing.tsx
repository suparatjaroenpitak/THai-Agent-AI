"use client";

import { Activity, Gauge, GitCompareArrows, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supportedProviderGroups } from "@/components/opencodex/data";

const metrics = [
  { label: "Cheapest", value: "DeepSeek V3", icon: WalletCards, tone: "text-emerald-300" },
  { label: "Fallback", value: "Qwen3", icon: GitCompareArrows, tone: "text-amber-300" },
  { label: "Latency", value: "618 ms", icon: Gauge, tone: "text-sky-300" },
  { label: "Balance", value: "4 pools", icon: Activity, tone: "text-rose-300" }
];

export function ProviderRouting() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#181a1c]">
      <div className="grid grid-cols-2 gap-2 border-b border-white/10 p-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="min-w-0 rounded-md border border-white/10 bg-white/[0.025] p-2">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <Icon className={`size-3.5 ${metric.tone}`} />
                {metric.label}
              </div>
              <div className="mt-1 truncate text-xs font-semibold text-zinc-100">{metric.value}</div>
            </div>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 scrollbar-thin">
        <div className="space-y-3">
          {supportedProviderGroups.map((group) => (
            <div key={group.name} className="rounded-md border border-white/10 bg-white/[0.025] p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-200">{group.name}</span>
                <Badge variant="outline" className="border-white/10 text-[10px] text-zinc-400">
                  {group.models.length}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.models.map((model) => (
                  <span key={model} className="rounded border border-white/10 px-1.5 py-1 text-[10px] text-zinc-400">
                    {model}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
