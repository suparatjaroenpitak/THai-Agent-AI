"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BrainCircuit, Gauge, KeyRound, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { ModelConfig } from "@/components/opencodex/types";

export const defaultModelConfig: ModelConfig = {
  model: "deepseek-chat",
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: ""
};

type ProviderItem = {
  id: string;
  label: string;
  provider: string;
  baseUrl: string;
  tags: string[];
};

type ProvidersResponse = {
  providers: ProviderItem[];
  routing?: {
    primary?: ProviderItem;
    fallbacks?: ProviderItem[];
  };
};

export function ProviderRouting({
  config,
  onChange
}: {
  config: ModelConfig;
  onChange: (config: ModelConfig) => void;
}) {
  const [providers, setProviders] = useState<ProviderItem[]>([]);

  useEffect(() => {
    let disposed = false;

    fetch("/api/providers")
      .then((response) => response.json() as Promise<ProvidersResponse>)
      .then((data) => {
        if (!disposed) setProviders(data.providers ?? []);
      })
      .catch(() => {
        if (!disposed) setProviders([]);
      });

    return () => {
      disposed = true;
    };
  }, []);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === config.model && provider.baseUrl === config.baseUrl) ?? providers[0],
    [config.baseUrl, config.model, providers]
  );

  const metrics = [
    { label: "Model", value: selectedProvider?.label ?? config.model, icon: BrainCircuit, tone: "text-emerald-300" },
    { label: "Provider", value: selectedProvider?.provider ?? "custom", icon: Activity, tone: "text-amber-300" },
    { label: "Endpoint", value: config.baseUrl.replace(/^https?:\/\//, ""), icon: Gauge, tone: "text-sky-300" },
    { label: "Key", value: config.apiKey ? "browser" : "empty", icon: KeyRound, tone: config.apiKey ? "text-emerald-300" : "text-rose-300" }
  ];

  function patchConfig(patch: Partial<ModelConfig>) {
    onChange({ ...config, ...patch });
  }

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

      <div className="space-y-3 border-b border-white/10 p-3">
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase text-zinc-500">Model</label>
          <Input
            value={config.model}
            onChange={(event) => patchConfig({ model: event.target.value })}
            className="h-8 border-white/10 bg-black/20 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase text-zinc-500">Base URL</label>
          <Input
            value={config.baseUrl}
            onChange={(event) => patchConfig({ baseUrl: event.target.value })}
            className="h-8 border-white/10 bg-black/20 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase text-zinc-500">API Key</label>
          <Input
            type="password"
            value={config.apiKey}
            onChange={(event) => patchConfig({ apiKey: event.target.value })}
            className="h-8 border-white/10 bg-black/20 text-xs"
            placeholder="sk-..."
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3 scrollbar-thin">
        <div className="space-y-2">
          {providers.map((provider) => (
            <button
              key={`${provider.provider}:${provider.id}:${provider.baseUrl}`}
              onClick={() => patchConfig({ model: provider.id, baseUrl: provider.baseUrl })}
              className={`w-full rounded-md border p-2 text-left transition-colors ${
                provider.id === config.model && provider.baseUrl === config.baseUrl
                  ? "border-emerald-400/40 bg-emerald-400/10"
                  : "border-white/10 bg-white/[0.025] hover:bg-white/[0.06]"
              }`}
            >
              <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-zinc-200">{provider.label}</span>
                <Badge variant="outline" className="border-white/10 text-[10px] text-zinc-400">
                  {provider.provider}
                </Badge>
              </div>
              <div className="truncate text-[11px] text-zinc-500">{provider.id}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {provider.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-500">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
          {providers.length === 0 ? (
            <div className="rounded-md border border-white/10 bg-white/[0.025] p-3 text-xs text-zinc-500">
              Provider catalog unavailable
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
