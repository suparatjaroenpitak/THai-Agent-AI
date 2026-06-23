"use client";

import { useEffect, useState } from "react";
import { Activity, BrainCircuit, CircleCheck, CircleX, Cpu, Download, Gauge, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ModelConfig, OllamaModelInfo } from "@/components/opencodex/types";

export const defaultModelConfig: ModelConfig = {
  model: "qwen2.5-coder",
  reasoningModel: "deepseek-r1",
  codingModel: "qwen2.5-coder",
  embedModel: "nomic-embed-text",
};

type ModelsResponse = {
  models: OllamaModelInfo[];
  config?: {
    host: string;
    defaultModel: string;
    reasoningModel: string;
    embedModel: string;
  };
  error?: string;
};

export function ProviderRouting({
  config,
  onChange,
}: {
  config: ModelConfig;
  onChange: (config: ModelConfig) => void;
}) {
  const [models, setModels] = useState<OllamaModelInfo[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<"loading" | "connected" | "error">("loading");
  const [pullModel, setPullModel] = useState("");
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState<{ status: string; percentage: number } | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    setOllamaStatus("loading");
    try {
      const response = await fetch("/api/ollama/models");
      const data = (await response.json()) as ModelsResponse;
      if (data.error) {
        setOllamaStatus("error");
        setModels([]);
      } else {
        setOllamaStatus("connected");
        setModels(data.models ?? []);
      }
    } catch {
      setOllamaStatus("error");
      setModels([]);
    }
  }

  async function handlePull() {
    if (!pullModel.trim() || pulling) return;
    setPulling(true);
    try {
      const response = await fetch("/api/ollama/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: pullModel.trim() }),
      });

      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.status) {
                  let percentage = 0;
                  if (data.total && data.completed) {
                    percentage = Math.round((data.completed / data.total) * 100);
                  }
                  setPullProgress({ status: data.status, percentage });
                }
              } catch {
                // ignore parse error
              }
            }
          }
        }
        reader.releaseLock();
      }

      setPullModel("");
      setPullProgress(null);
      await loadModels();
    } catch {
      // error handled silently
      setPullProgress({ status: "Error pulling model", percentage: 0 });
    } finally {
      setPulling(false);
    }
  }

  function patchConfig(patch: Partial<ModelConfig>) {
    onChange({ ...config, ...patch });
  }

  function formatSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }

  const metrics = [
    {
      label: "Status",
      value: ollamaStatus === "connected" ? "Connected" : ollamaStatus === "loading" ? "Checking..." : "Offline",
      icon: ollamaStatus === "connected" ? CircleCheck : ollamaStatus === "loading" ? Loader2 : CircleX,
      tone: ollamaStatus === "connected" ? "text-emerald-300" : ollamaStatus === "loading" ? "text-amber-300" : "text-rose-300",
    },
    { label: "Provider", value: "Ollama", icon: Cpu, tone: "text-sky-300" },
    { label: "Models", value: `${models.length} installed`, icon: BrainCircuit, tone: "text-amber-300" },
    { label: "Endpoint", value: "localhost:11434", icon: Gauge, tone: "text-sky-300" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#181a1c]">
      {/* Status grid */}
      <div className="grid grid-cols-2 gap-2 border-b border-white/10 p-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="min-w-0 rounded-md border border-white/10 bg-white/[0.025] p-2">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <Icon className={`size-3.5 ${metric.tone} ${metric.icon === Loader2 ? "animate-spin" : ""}`} />
                {metric.label}
              </div>
              <div className="mt-1 truncate text-xs font-semibold text-zinc-100">{metric.value}</div>
            </div>
          );
        })}
      </div>

      {/* Model selection */}
      <div className="space-y-3 border-b border-white/10 p-3">
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase text-zinc-500">Default Model</label>
          <select
            value={config.model}
            onChange={(e) => patchConfig({ model: e.target.value })}
            className="h-8 w-full rounded-md border border-white/10 bg-black/20 px-2 text-xs text-zinc-200 outline-none"
          >
            {models.filter((m) => !m.tags.includes("embedding")).map((m) => (
              <option key={m.id} value={m.id} className="bg-[#1b1d1f]">{m.label} ({m.parameterSize})</option>
            ))}
            <option value={config.model} className="bg-[#1b1d1f]">{config.model}</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase text-zinc-500">Reasoning Model</label>
          <select
            value={config.reasoningModel}
            onChange={(e) => patchConfig({ reasoningModel: e.target.value })}
            className="h-8 w-full rounded-md border border-white/10 bg-black/20 px-2 text-xs text-zinc-200 outline-none"
          >
            {models.filter((m) => !m.tags.includes("embedding")).map((m) => (
              <option key={m.id} value={m.id} className="bg-[#1b1d1f]">{m.label} ({m.parameterSize})</option>
            ))}
            <option value={config.reasoningModel} className="bg-[#1b1d1f]">{config.reasoningModel}</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase text-zinc-500">Coding Model</label>
          <select
            value={config.codingModel}
            onChange={(e) => patchConfig({ codingModel: e.target.value })}
            className="h-8 w-full rounded-md border border-white/10 bg-black/20 px-2 text-xs text-zinc-200 outline-none"
          >
            {models.filter((m) => !m.tags.includes("embedding")).map((m) => (
              <option key={m.id} value={m.id} className="bg-[#1b1d1f]">{m.label} ({m.parameterSize})</option>
            ))}
            <option value={config.codingModel} className="bg-[#1b1d1f]">{config.codingModel}</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase text-zinc-500">Embedding Model</label>
          <select
            value={config.embedModel}
            onChange={(e) => patchConfig({ embedModel: e.target.value })}
            className="h-8 w-full rounded-md border border-white/10 bg-black/20 px-2 text-xs text-zinc-200 outline-none"
          >
            {models.filter((m) => m.tags.includes("embedding")).map((m) => (
              <option key={m.id} value={m.id} className="bg-[#1b1d1f]">{m.label} ({m.parameterSize})</option>
            ))}
            <option value={config.embedModel} className="bg-[#1b1d1f]">{config.embedModel}</option>
          </select>
        </div>
      </div>

      {/* Pull model */}
      <div className="border-b border-white/10 p-3">
        <label className="mb-1.5 block text-[11px] uppercase text-zinc-500">Pull New Model</label>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={pullModel}
              onChange={(e) => setPullModel(e.target.value)}
              className="h-8 flex-1 border-white/10 bg-black/20 text-xs"
              placeholder="e.g. llama3.2, phi4, gemma3"
              onKeyDown={(e) => { if (e.key === "Enter") handlePull(); }}
            />
            <Button size="sm" onClick={handlePull} disabled={pulling || !pullModel.trim()}>
              {pulling ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
              Pull
            </Button>
          </div>
          {pullProgress && (
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span className="truncate">{pullProgress.status}</span>
                {pullProgress.percentage > 0 && <span>{pullProgress.percentage}%</span>}
              </div>
              {pullProgress.percentage > 0 && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300" 
                    style={{ width: `${pullProgress.percentage}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Installed models list */}
      <div className="min-h-0 flex-1 overflow-auto p-3 scrollbar-thin">
        <div className="space-y-2">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                if (model.tags.includes("embedding")) {
                  patchConfig({ embedModel: model.id });
                } else {
                  patchConfig({ model: model.id, codingModel: model.id });
                }
              }}
              className={`w-full rounded-md border p-2 text-left transition-colors ${
                model.id === config.model || model.id === config.codingModel || model.id === config.embedModel
                  ? "border-emerald-400/40 bg-emerald-400/10"
                  : "border-white/10 bg-white/[0.025] hover:bg-white/[0.06]"
              }`}
            >
              <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-zinc-200">{model.label}</span>
                <Badge variant="outline" className="border-white/10 text-[10px] text-zinc-400">
                  {model.parameterSize}
                </Badge>
              </div>
              <div className="truncate text-[11px] text-zinc-500">{model.id}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {model.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-500">
                    {tag}
                  </span>
                ))}
                <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-500">
                  {formatSize(model.sizeBytes)}
                </span>
              </div>
            </button>
          ))}
          {models.length === 0 && ollamaStatus !== "loading" ? (
            <div className="rounded-md border border-white/10 bg-white/[0.025] p-3 text-xs text-zinc-500">
              {ollamaStatus === "error"
                ? "Cannot connect to Ollama. Run: ollama serve"
                : "No models installed. Pull a model to get started."}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
