"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Bot, CheckCircle2, Circle, Loader2, RotateCcw, Send, Square, Sparkles, StepForward, Wrench, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { agentWorkflow, toolGroups } from "@/components/opencodex/data";
import type { ModelConfig, StreamEvent } from "@/components/opencodex/types";

type ChatMessage = {
  role: "user" | "assistant" | "tool" | "thinking";
  content: string;
  model?: string;
  duration?: number;
  tokenCount?: number;
};

export type WorkflowStep = {
  role: string;
  status: "done" | "active" | "queued" | "failed";
  content: string;
  duration?: number;
};

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content: "Ready. Select a workspace, configure an Ollama model, then ask the agent to inspect or change the project.",
  },
];

export function AgentChat({
  workspaceId,
  activePath,
  modelConfig,
  onWorkflowSteps,
}: {
  workspaceId: string;
  activePath?: string;
  modelConfig: ModelConfig;
  onWorkflowSteps?: (steps: WorkflowStep[]) => void;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [prompt, setPrompt] = useState("");
  const [promptMode, setPromptMode] = useState<"chat" | "agent">("chat");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastPromptRef = useRef("");

  const activeAgent = useMemo(() => agentWorkflow.find((agent) => agent.status === "active"), []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((current) => [...current, msg]);
  }, []);

  const updateLastAssistant = useCallback((content: string) => {
    setMessages((current) => {
      const updated = [...current];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === "assistant") {
          updated[i] = { ...updated[i], content };
          break;
        }
      }
      return updated;
    });
  }, []);

  async function submitStreamingChat(userPrompt: string, agentMode = false) {
    if (!userPrompt.trim() || busy) return;
    setBusy(true);
    setStreaming(true);
    lastPromptRef.current = userPrompt;

    addMessage({ role: "user", content: userPrompt });
    if (!agentMode) {
      addMessage({ role: "assistant", content: "" });
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a senior AI coding agent. You help users inspect, edit, test, and deploy code. Workspace: ${workspaceId}. Active file: ${activePath ?? "none"}. Be concise and actionable. Always respond in Thai language.`,
            },
            { role: "user", content: userPrompt },
          ],
          model: modelConfig.model,
          temperature: 0.2,
          num_ctx: 8192,
          agent: agentMode,
          workspaceId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        updateLastAssistant(`Error: ${errorText}`);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";
      let toolMessagesCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data) as StreamEvent;

            if (event.type === "chunk") {
              accumulated += event.content;
              updateLastAssistant(accumulated);
            }

            if (event.type === "text") {
              if (!agentMode) {
                accumulated += event.content;
                updateLastAssistant(accumulated);
              } else {
                addMessage({ role: "assistant", content: event.content });
              }
            }

            if (event.type === "tool_call") {
              toolMessagesCount++;
              addMessage({
                role: "tool",
                content: `🔧 Calling tool: ${event.tool}\nArguments:\n\`\`\`json\n${JSON.stringify(event.arguments, null, 2)}\n\`\`\``,
              });
            }

            if (event.type === "tool_result") {
              const statusIcon = event.success ? "✅" : "❌";
              addMessage({
                role: "tool",
                content: `${statusIcon} Tool: ${event.tool} (${event.durationMs}ms)\n\`\`\`\n${event.output.slice(0, 2000)}${event.output.length > 2000 ? "\n... (truncated)" : ""}\n\`\`\``,
              });
            }

            if (event.type === "done") {
              if (agentMode) {
                // Agent mode complete
              } else {
                setMessages((current) => {
                  const updated = [...current];
                  for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].role === "assistant") {
                      updated[i] = {
                        ...updated[i],
                        model: (event as any).model,
                        duration: (event as any).totalDuration ? Math.round((event as any).totalDuration / 1_000_000) : undefined,
                        tokenCount: (event as any).completionTokens,
                      };
                      break;
                    }
                  }
                  return updated;
                });
              }
            }

            if (event.type === "error") {
              if (agentMode) {
                addMessage({ role: "assistant", content: `Error: ${event.error}` });
              } else {
                updateLastAssistant(`Error: ${event.error}`);
              }
            }

            if (event.type === "aborted") {
              if (!agentMode) {
                updateLastAssistant(accumulated || "(Aborted)");
              }
            }
          } catch {
            // skip malformed SSE
          }
        }
      }
    } catch (error) {
      if (controller.signal.aborted) {
        // User cancelled — keep what we have
      } else {
        const message = error instanceof Error ? error.message : "Stream failed";
        if (agentMode) {
          addMessage({ role: "assistant", content: `Connection error: ${message}` });
        } else {
          updateLastAssistant(`Connection error: ${message}`);
        }
      }
    } finally {
      setBusy(false);
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function submitAgentWorkflow(userPrompt: string) {
    if (!userPrompt.trim() || busy) return;
    setBusy(true);
    lastPromptRef.current = userPrompt;

    addMessage({ role: "user", content: userPrompt });

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
            reasoningModel: modelConfig.reasoningModel,
            codingModel: modelConfig.codingModel,
            embedModel: modelConfig.embedModel,
          },
        }),
      });
      const data = (await response.json()) as { message?: string; steps?: WorkflowStep[] };
      if (Array.isArray(data.steps)) {
        onWorkflowSteps?.(data.steps);
      }
      addMessage({
        role: "assistant",
        content: data.message ?? "Workflow completed.",
      });
    } catch {
      addMessage({
        role: "assistant",
        content: "Agent request failed. Check that Ollama is running and the model is installed.",
      });
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit() {
    if (!prompt.trim()) return;
    const userPrompt = prompt.trim();
    setPrompt("");

    if (promptMode === "agent" || userPrompt.startsWith("/agent ") || userPrompt.startsWith("/workflow ")) {
      const cleanPrompt = userPrompt.replace(/^\/(agent|workflow)\s+/, "");
      if (promptMode === "agent") {
        void submitStreamingChat(cleanPrompt, true);
      } else {
        void submitAgentWorkflow(cleanPrompt);
      }
    } else {
      void submitStreamingChat(userPrompt, false);
    }
  }

  function handleAbort() {
    abortRef.current?.abort();
  }

  function handleRetry() {
    if (lastPromptRef.current) {
      // Remove last assistant + user message pair
      setMessages((current) => {
        const trimmed = [...current];
        while (trimmed.length > 1) {
          const last = trimmed[trimmed.length - 1];
          if (last.role === "user" && last.content === lastPromptRef.current) {
            trimmed.pop();
            break;
          }
          trimmed.pop();
        }
        return trimmed;
      });
      void submitStreamingChat(lastPromptRef.current);
    }
  }

  function handleContinue() {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistant?.content) {
      void submitStreamingChat(`Continue from: ${lastAssistant.content.slice(-200)}`);
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
              className={`rounded-md border p-3 text-xs leading-5 ${
                message.role === "thinking"
                  ? "border-amber-400/20 bg-amber-400/5 text-amber-200"
                  : "border-white/10 bg-white/[0.035] text-zinc-200"
              }`}
            >
              <div className="mb-1 flex items-center gap-2 text-[11px] uppercase text-zinc-500">
                {message.role === "tool" ? (
                  <Wrench className="size-3" />
                ) : (
                  <Sparkles className="size-3" />
                )}
                {message.role}
                {message.model && (
                  <span className="ml-auto font-mono text-[10px] text-zinc-600">{message.model}</span>
                )}
                {message.duration !== undefined && (
                  <span className="text-[10px] text-zinc-600">{message.duration}ms</span>
                )}
                {message.tokenCount !== undefined && (
                  <span className="text-[10px] text-zinc-600">{message.tokenCount} tok</span>
                )}
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          ))}
          {streaming && (
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <Loader2 className="size-3 animate-spin" />
              Streaming from Ollama...
            </div>
          )}
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="min-h-20 resize-none border-white/10 bg-black/20 text-xs"
          placeholder="Chat with Ollama, or /agent <task> for full workflow"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Select value={promptMode} onValueChange={(val) => setPromptMode(val as "chat" | "agent")}>
              <SelectTrigger className="h-6 w-32 border-white/10 bg-black/20 text-[10px]">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chat">Search ทั่วไป</SelectItem>
                <SelectItem value="agent">AGENT เขียนโค้ด</SelectItem>
              </SelectContent>
            </Select>
            <span className="hidden sm:inline-flex items-center gap-1.5 ml-1">
              {busy ? <Loader2 className="size-3 animate-spin" /> : <Circle className="size-3" />}
              {modelConfig.model}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {streaming && (
              <Button variant="chrome" size="sm" onClick={handleAbort}>
                <Square className="size-3" />
                Stop
              </Button>
            )}
            {!busy && lastPromptRef.current && (
              <>
                <Button variant="chrome" size="sm" onClick={handleRetry}>
                  <RotateCcw className="size-3" />
                  Retry
                </Button>
                <Button variant="chrome" size="sm" onClick={handleContinue}>
                  <StepForward className="size-3" />
                  Continue
                </Button>
              </>
            )}
            <Button size="sm" onClick={handleSubmit} disabled={busy || !prompt.trim()}>
              {busy ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkflowPanel({ steps = [] }: { steps?: WorkflowStep[] }) {
  const renderedSteps: Array<{ role: string; status: "done" | "active" | "queued" | "failed"; detail: string; duration?: number }> =
    steps.length > 0
      ? steps.map((step) => ({
          role: step.role,
          status: step.status,
          detail: step.content,
          duration: step.duration,
        }))
      : agentWorkflow;

  return (
    <div className="h-full overflow-auto bg-[#181a1c] p-3 scrollbar-thin">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-200">Workflow</span>
        <Badge variant="info">LangGraph + Ollama</Badge>
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
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <div className="truncate text-xs font-medium text-zinc-200">{agent.role}</div>
                {agent.duration !== undefined && (
                  <span className="text-[10px] text-zinc-600">{agent.duration}ms</span>
                )}
              </div>
              <div className="truncate text-[11px] text-zinc-500">{agent.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
