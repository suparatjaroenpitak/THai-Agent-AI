"use client";

import { useMemo, useState } from "react";
import { Bot, CheckCircle2, Circle, Loader2, Send, Sparkles, Wrench, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { agentWorkflow, toolGroups } from "@/components/opencodex/data";
import type { ModelConfig } from "@/components/opencodex/types";

type ChatMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
};

export type WorkflowStep = {
  role: string;
  status: "done" | "active" | "queued" | "failed";
  content: string;
};

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content: "Ready. Select a workspace, configure a model, then ask the agent to inspect or change the project."
  }
];

export function AgentChat({
  workspaceId,
  activePath,
  modelConfig,
  onWorkflowSteps
}: {
  workspaceId: string;
  activePath?: string;
  modelConfig: ModelConfig;
  onWorkflowSteps?: (steps: WorkflowStep[]) => void;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  const activeAgent = useMemo(() => agentWorkflow.find((agent) => agent.status === "active"), []);

  async function submitPrompt() {
    if (!prompt.trim() || busy) return;
    const userPrompt = prompt.trim();
    setPrompt("");
    setBusy(true);
    setMessages((current) => [...current, { role: "user", content: userPrompt }]);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          workspaceId,
          activePath,
          mode: "coding",
          model: {
            model: modelConfig.model,
            baseUrl: modelConfig.baseUrl,
            apiKey: modelConfig.apiKey || undefined
          }
        })
      });
      const data = (await response.json()) as { message?: string; steps?: WorkflowStep[] };
      if (Array.isArray(data.steps)) {
        onWorkflowSteps?.(data.steps);
      }
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.message ?? "Workflow queued. Agent telemetry is available in the task panel."
        }
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Agent request failed. Check the model key, base URL, and selected workspace."
        }
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#181a1c]">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/10 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Bot className="size-4 text-emerald-300" />
          <span className="truncate text-xs font-semibold text-zinc-100">Agent Console</span>
        </div>
        <Badge variant="success" className="shrink-0">
          {activeAgent?.role ?? "Ready"}
        </Badge>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-xs leading-5 text-zinc-200"
            >
              <div className="mb-1 flex items-center gap-2 text-[11px] uppercase text-zinc-500">
                {message.role === "tool" ? <Wrench className="size-3" /> : <Sparkles className="size-3" />}
                {message.role}
              </div>
              {message.content}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-white/10 p-3">
        <div className="mb-3 grid grid-cols-2 gap-2">
          {toolGroups.slice(0, 4).map((tool) => {
            const Icon = tool.icon;
            return (
              <div key={tool.name} className="flex min-w-0 items-center gap-2 rounded-md border border-white/10 px-2 py-1.5">
                <Icon className="size-3.5 shrink-0 text-sky-300" />
                <span className="truncate text-[11px] text-zinc-300">{tool.name}</span>
                <span className="ml-auto text-[10px] text-zinc-500">{tool.count}</span>
              </div>
            );
          })}
        </div>
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="min-h-20 resize-none border-white/10 bg-black/20 text-xs"
          placeholder="Ask the agent to inspect, edit, test, or prepare a Git change"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Circle className="size-3" />}
            Auto routing
          </div>
          <Button size="sm" onClick={submitPrompt} disabled={busy}>
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

export function WorkflowPanel({ steps = [] }: { steps?: WorkflowStep[] }) {
  const renderedSteps: Array<{ role: string; status: "done" | "active" | "queued" | "failed"; detail: string }> =
    steps.length > 0
      ? steps.map((step) => ({
          role: step.role,
          status: step.status,
          detail: step.content
        }))
      : agentWorkflow;

  return (
    <div className="h-full overflow-auto bg-[#181a1c] p-3 scrollbar-thin">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-200">Workflow</span>
        <Badge variant="info">LangGraph</Badge>
      </div>
      <div className="space-y-2">
        {renderedSteps.map((agent) => (
          <div key={agent.role} className="flex gap-3 rounded-md border border-white/10 bg-white/[0.025] p-2">
            <div className="pt-0.5">
              {agent.status === "done" ? (
                <CheckCircle2 className="size-4 text-emerald-300" />
              ) : agent.status === "failed" ? (
                <XCircle className="size-4 text-rose-300" />
              ) : agent.status === "active" ? (
                <Loader2 className="size-4 animate-spin text-amber-300" />
              ) : (
                <Circle className="size-4 text-zinc-600" />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-zinc-200">{agent.role}</div>
              <div className="truncate text-[11px] text-zinc-500">{agent.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
