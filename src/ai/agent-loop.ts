import { runOllamaChat, type ChatMessage, type OllamaToolCall, type OllamaChatOptions } from "@/ai/model-client";
import { toolDefinitions, executeTool, type ToolResult } from "@/ai/tools";

export type AgentLoopEvent =
  | { type: "text"; content: string }
  | { type: "tool_call"; tool: string; arguments: Record<string, unknown> }
  | { type: "tool_result"; tool: string; success: boolean; output: string; durationMs: number }
  | { type: "done"; totalDurationMs: number; totalTokens: number }
  | { type: "error"; error: string };

export type AgentLoopOptions = {
  systemPrompt?: string;
  model: string;
  workspaceId?: string;
  maxIterations?: number;
  onEvent?: (event: AgentLoopEvent) => void;
  signal?: AbortSignal;
  options?: OllamaChatOptions;
};

const AGENT_SYSTEM_PROMPT = `You are an AI coding agent with the ability to execute tools to help users.

You have access to tools for:
- Reading, writing, deleting, and renaming files
- Running terminal commands
- Running git commands
- Searching code
- Searching the web for information
- Making HTTP requests
- Storing and recalling information in memory

Rules:
1. Analyze the user's request and break it down into steps
2. Use tools to accomplish each step
3. When you use a tool, wait for the result before continuing
4. You can use multiple tools in sequence to accomplish complex tasks
5. After completing all necessary tool calls, provide a clear summary to the user
6. Always use the workspace tools when the user asks about files or code
7. If a command fails, try to diagnose and fix the issue

Important: Always respond to the user in Thai language unless they ask otherwise.`;

export async function runAgentLoop(
  messages: ChatMessage[],
  opts: AgentLoopOptions
): Promise<{ content: string; events: AgentLoopEvent[] }> {
  const {
    systemPrompt = AGENT_SYSTEM_PROMPT,
    model,
    workspaceId = "current-workspace",
    maxIterations = 25,
    onEvent,
    signal,
    options,
  } = opts;

  const events: AgentLoopEvent[] = [];
  let iterationCount = 0;
  const startTime = Date.now();
  let totalTokens = 0;

  const fullMessages: ChatMessage[] = [{ role: "system", content: systemPrompt }, ...messages];

  while (iterationCount < maxIterations) {
    if (signal?.aborted) {
      events.push({ type: "error", error: "Agent loop aborted" });
      break;
    }

    iterationCount++;

    let response;
    try {
      response = await runOllamaChat({
        messages: fullMessages,
        model,
        tools: toolDefinitions,
        options: { temperature: 0.1, num_ctx: 8192, ...options },
        signal,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      events.push({ type: "error", error: `Model call failed: ${message}` });
      break;
    }

    if (response.prompt_eval_count) totalTokens += response.prompt_eval_count;
    if (response.eval_count) totalTokens += response.eval_count;

    const assistantContent = response.message.content;
    const toolCalls = response.message.tool_calls;

    fullMessages.push({
      role: "assistant",
      content: assistantContent,
      tool_calls: toolCalls,
    });

    if (assistantContent) {
      const event: AgentLoopEvent = { type: "text", content: assistantContent };
      events.push(event);
      onEvent?.(event);
    }

    if (!toolCalls || toolCalls.length === 0) {
      break;
    }

    for (const toolCall of toolCalls) {
      if (signal?.aborted) break;

      const callEvent: AgentLoopEvent = {
        type: "tool_call",
        tool: toolCall.function.name,
        arguments: toolCall.function.arguments,
      };
      events.push(callEvent);
      onEvent?.(callEvent);

      let result: ToolResult;
      try {
        result = await executeTool(toolCall, workspaceId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result = { tool: toolCall.function.name, success: false, output: `Execution error: ${message}`, durationMs: 0 };
      }

      const resultEvent: AgentLoopEvent = {
        type: "tool_result",
        tool: result.tool,
        success: result.success,
        output: result.output,
        durationMs: result.durationMs,
      };
      events.push(resultEvent);
      onEvent?.(resultEvent);

      fullMessages.push({
        role: "tool",
        content: result.output,
      });
    }
  }

  const doneEvent: AgentLoopEvent = {
    type: "done",
    totalDurationMs: Date.now() - startTime,
    totalTokens,
  };
  events.push(doneEvent);
  onEvent?.(doneEvent);

  const lastText = [...events].reverse().find((e) => e.type === "text");
  return {
    content: lastText?.content ?? "",
    events,
  };
}
