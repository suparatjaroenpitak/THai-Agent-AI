import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { runOllamaChat, resolveModel, type RuntimeModelConfig, type ChatMessage } from "@/ai/model-client";
import { routeModel, type RoutingMode } from "@/ai/router";
import { collectWorkspaceContext } from "@/workspace/server-project";
import { toolDefinitions, executeTool } from "@/ai/tools";

// ── Types ───────────────────────────────────────────────────────────────────

export type AgentStep = {
  role: string;
  status: "done" | "active" | "queued" | "failed";
  content: string;
  duration?: number;
};

export type AgentInput = {
  prompt: string;
  workspaceId: string;
  mode?: RoutingMode;
  activePath?: string;
  model?: RuntimeModelConfig;
};

// ── State ───────────────────────────────────────────────────────────────────

const AgentState = Annotation.Root({
  prompt: Annotation<string>(),
  workspaceId: Annotation<string>(),
  mode: Annotation<RoutingMode>({
    default: () => "auto",
    reducer: (_left, right) => right,
  }),
  activePath: Annotation<string | undefined>({
    default: () => undefined,
    reducer: (_left, right) => right,
  }),
  model: Annotation<RuntimeModelConfig | undefined>({
    default: () => undefined,
    reducer: (_left, right) => right,
  }),
  steps: Annotation<AgentStep[]>({
    default: () => [],
    reducer: (left, right) => left.concat(right),
  }),
  needsFix: Annotation<boolean>({
    default: () => false,
    reducer: (_left, right) => right,
  }),
  summary: Annotation<string>({
    default: () => "",
    reducer: (_left, right) => right,
  }),
  context: Annotation<string>({
    default: () => "",
    reducer: (_left, right) => right,
  }),
  plan: Annotation<string>({
    default: () => "",
    reducer: (_left, right) => right,
  }),
  toolResults: Annotation<string[]>({
    default: () => [],
    reducer: (left, right) => left.concat(right),
  }),
});

const SAFE_OLLAMA_NUM_CTX = 8192;
const FALLBACK_OLLAMA_NUM_CTX = 4096;
const SAFE_PROMPT_CHARS = 18000;
const FALLBACK_PROMPT_CHARS = 10000;

// ── Helper ──────────────────────────────────────────────────────────────────

function clampPrompt(content: string, limit: number): string {
  if (content.length <= limit) {
    return content;
  }

  const headLength = Math.floor(limit * 0.8);
  const tailLength = Math.max(0, limit - headLength);
  const omittedChars = content.length - headLength - tailLength;

  return [
    content.slice(0, headLength),
    `[truncated ${omittedChars} chars to fit local Ollama memory limits]`,
    content.slice(-tailLength),
  ].join("\n\n");
}

function isCudaMemoryFault(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("cuda error") || message.includes("illegal memory access");
}

async function callOllama(
  systemPrompt: string,
  userContent: string,
  model: string
): Promise<{ content: string; duration: number }> {
  const start = Date.now();
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: clampPrompt(userContent, SAFE_PROMPT_CHARS) },
  ];

  try {
    const result = await runOllamaChat({ 
      messages, 
      model,
      options: { num_ctx: SAFE_OLLAMA_NUM_CTX, temperature: 0.1 }
    });

    return {
      content: result.message.content,
      duration: Date.now() - start,
    };
  } catch (error) {
    if (!isCudaMemoryFault(error)) {
      throw error;
    }

    const retryMessages: ChatMessage[] = [
      {
        role: "system",
        content: `${systemPrompt}\nKeep the answer concise and prioritize only the highest-signal findings.`,
      },
      { role: "user", content: clampPrompt(userContent, FALLBACK_PROMPT_CHARS) },
    ];

    try {
      const retryResult = await runOllamaChat({
        messages: retryMessages,
        model,
        options: { num_ctx: FALLBACK_OLLAMA_NUM_CTX, temperature: 0.1 },
      });

      return {
        content: retryResult.message.content,
        duration: Date.now() - start,
      };
    } catch (retryError) {
      const primaryMessage = error instanceof Error ? error.message : String(error);
      const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
      throw new Error(
        `Ollama CUDA fallback failed after reducing context from ${SAFE_OLLAMA_NUM_CTX} to ${FALLBACK_OLLAMA_NUM_CTX}. Initial error: ${primaryMessage}. Retry error: ${retryMessage}`
      );
    }
  }
}

async function plannerAgent(state: typeof AgentState.State) {
  try {
    const model = state.model?.model || "qwen2.5-coder:7b";
    
    // Fallback logic
    const activeModel = await resolveModel();
    const finalModel = model ?? activeModel;
    const result = await callOllama(
      "You are a senior engineering planner. Analyze the user's request and break it down into concrete execution steps. Output a numbered plan. Be concise.\nAlways respond and explain your thoughts clearly in Thai language.",
      `Workspace: ${state.workspaceId}\nActive file: ${state.activePath ?? "none"}\n\nRequest:\n${state.prompt}`,
      model
    );
    return {
      plan: result.content,
      steps: [{ role: "Planner", status: "done" as const, content: result.content, duration: result.duration }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Planner failed";
    return {
      plan: state.prompt,
      steps: [{ role: "Planner", status: "failed" as const, content: message }],
    };
  }
}

async function researchAgent(state: typeof AgentState.State) {
  try {
    const wsContext = await collectWorkspaceContext(state.workspaceId, state.activePath);
    const fileList = wsContext.files.map((f) => `${f.path} (${f.content.length} chars)`).join("\n");
    const contextBlock = wsContext.files
      .map((f) => `--- ${f.path}\n${f.content}`)
      .join("\n\n")
      .slice(0, 32000);

    return {
      context: contextBlock,
      steps: [
        {
          role: "Research",
          status: "done" as const,
          content: `Collected ${wsContext.files.length} files from workspace ${wsContext.workspace.name}:\n${fileList}`,
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Research failed";
    return {
      context: "",
      steps: [{ role: "Research", status: "failed" as const, content: message }],
    };
  }
}

async function architectAgent(state: typeof AgentState.State) {
  const model = resolveModel(state.model, "reasoning");
  const routing = routeModel({ mode: state.mode ?? "auto", config: state.model });

  try {
    const result = await callOllama(
      `You are a software architect. Review the plan and workspace context. Propose the architecture, file structure, and key design decisions. Specify which files to create/modify and what changes are needed.
Always respond and explain your thoughts clearly in Thai language.`,
      `Plan:\n${state.plan}\n\nContext:\n${state.context.slice(0, 16000)}`,
      model
    );
    return {
      steps: [
        {
          role: "Architect",
          status: "done" as const,
          content: result.content,
          duration: result.duration,
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Architect failed";
    return {
      steps: [
        {
          role: "Architect",
          status: "failed" as const,
          content: `Model: ${routing.primary}. Error: ${message}`,
        },
      ],
    };
  }
}

async function coderAgent(state: typeof AgentState.State) {
  const model = resolveModel(state.model, "coding");

  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a senior coding agent. Work from the provided plan and repository context.

You have tools available to:
- Read files from the workspace
- Write files (create/modify code)
- Run terminal commands (install deps, build, etc.)
- Run git commands
- Search code

Use these tools to actually make the code changes needed. When you're done, provide a summary of what was changed.

Important: Always respond in Thai language.`,
      },
      {
        role: "user",
        content: clampPrompt(
          `Plan:\n${state.plan}\n\nArchitecture decisions:\n${state.steps
            .filter((s) => s.role === "Architect")
            .map((s) => s.content)
            .join("\n")}\n\nWorkspace context:\n${state.context.slice(0, 24000)}`,
          SAFE_PROMPT_CHARS
        ),
      },
    ];

    const response = await runOllamaChat({
      messages,
      model,
      tools: toolDefinitions,
      options: { num_ctx: SAFE_OLLAMA_NUM_CTX, temperature: 0.1 },
    });

    const { content, tool_calls } = response.message;
    const toolResults: string[] = [];

    if (tool_calls) {
      for (const tc of tool_calls) {
        const result = await executeTool(tc, state.workspaceId);
        toolResults.push(`${tc.function.name}: ${result.success ? "OK" : "FAIL"} - ${result.output.slice(0, 500)}`);
      }
    }

    const toolResultStr = toolResults.length > 0 ? `\n\nTool execution results:\n${toolResults.join("\n")}` : "";

    return {
      needsFix: false,
      summary: content + toolResultStr,
      toolResults,
      steps: [{ role: "Coder", status: "done" as const, content: content + toolResultStr, duration: response.total_duration ? Math.round(response.total_duration / 1_000_000) : 0 }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Coder agent failed";
    return {
      needsFix: false,
      summary: `Coder failed: ${message}`,
      steps: [{ role: "Coder", status: "failed" as const, content: message }],
    };
  }
}

async function reviewerAgent(state: typeof AgentState.State) {
  const model = resolveModel(state.model, "reasoning");

  try {
    const coderOutput = state.steps.filter((s) => s.role === "Coder").map((s) => s.content).join("\n");
    const result = await callOllama(
      `You are a code reviewer. Review the proposed changes for correctness, security, and best practices. Flag issues and suggest improvements. Be specific about file paths and line references.
Always respond and explain your thoughts clearly in Thai language.`,
      `Code changes:\n${coderOutput.slice(0, 24000)}`,
      model
    );

    return {
      steps: [{ role: "Reviewer", status: "done" as const, content: result.content, duration: result.duration }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review failed";
    return {
      steps: [{ role: "Reviewer", status: "failed" as const, content: message }],
    };
  }
}

async function testerAgent(state: typeof AgentState.State) {
  const model = resolveModel(state.model, "coding");

  try {
    const coderOutput = state.steps.filter((s) => s.role === "Coder").map((s) => s.content).join("\n");

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a testing engineer. Run the project's test suite using tools (e.g. 'bun test', 'npm test', 'vitest run'). If tests fail, report the failures clearly. Always respond in Thai language.`,
      },
      {
        role: "user",
        content: clampPrompt(`Code changes made:\n${coderOutput.slice(0, 8000)}\n\nRun the test suite to verify everything works.`, FALLBACK_PROMPT_CHARS),
      },
    ];

    const response = await runOllamaChat({
      messages,
      model,
      tools: toolDefinitions,
      options: { num_ctx: FALLBACK_OLLAMA_NUM_CTX, temperature: 0.1 },
    });

    const toolResults: string[] = [];
    if (response.message.tool_calls) {
      for (const tc of response.message.tool_calls) {
        const result = await executeTool(tc, state.workspaceId);
        toolResults.push(`${tc.function.name}: ${result.success ? "OK" : "FAIL"} - ${result.output.slice(0, 500)}`);
      }
    }

    const content = response.message.content;
    const extras = toolResults.length > 0 ? `\n---\nTest results:\n${toolResults.join("\n")}` : "";

    return {
      toolResults,
      steps: [{ role: "Tester", status: "done" as const, content: content + extras }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tester failed";
    return {
      steps: [{ role: "Tester", status: "failed" as const, content: message }],
    };
  }
}

async function debuggerAgent(state: typeof AgentState.State) {
  const model = resolveModel(state.model, "reasoning");

  try {
    const failedSteps = state.steps.filter((s) => s.status === "failed").map((s) => `${s.role}: ${s.content}`).join("\n");
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a debugging agent. Analyze errors and use tools to diagnose and fix issues. You can run terminal commands, read files, and write fixes. Always respond in Thai language.`,
      },
      {
        role: "user",
        content: clampPrompt(`Errors:\n${failedSteps}\n\nPlan:\n${state.plan}`, SAFE_PROMPT_CHARS),
      },
    ];

    const response = await runOllamaChat({
      messages,
      model,
      tools: toolDefinitions,
      options: { num_ctx: SAFE_OLLAMA_NUM_CTX, temperature: 0.1 },
    });

    const toolResults: string[] = [];
    if (response.message.tool_calls) {
      for (const tc of response.message.tool_calls) {
        const result = await executeTool(tc, state.workspaceId);
        toolResults.push(`${tc.function.name}: ${result.success ? "OK" : "FAIL"} - ${result.output.slice(0, 300)}`);
      }
    }

    const content = response.message.content;
    const extras = toolResults.length > 0 ? `\n---\nTool results:\n${toolResults.join("\n")}` : "";

    return {
      needsFix: false,
      toolResults,
      steps: [{ role: "Debugger", status: "done" as const, content: content + extras }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Debugger failed";
    return {
      needsFix: false,
      steps: [{ role: "Debugger", status: "failed" as const, content: message }],
    };
  }
}

async function securityAgent(state: typeof AgentState.State) {
  const model = resolveModel(state.model, "reasoning");

  try {
    const coderOutput = state.steps.filter((s) => s.role === "Coder").map((s) => s.content).join("\n");
    const result = await callOllama(
      `You are a security auditor. Review the code changes for security vulnerabilities: SQL injection, XSS, CSRF, secrets exposure, auth bypass, path traversal. Report findings with severity.
Always respond and explain your thoughts clearly in Thai language.`,
      `Code changes:\n${coderOutput.slice(0, 16000)}`,
      model
    );

    return {
      steps: [{ role: "Security", status: "done" as const, content: result.content, duration: result.duration }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Security check failed";
    return {
      steps: [{ role: "Security", status: "failed" as const, content: message }],
    };
  }
}

async function documentationAgent(state: typeof AgentState.State) {
  const model = resolveModel(state.model, "coding");

  try {
    const result = await callOllama(
      `You are a documentation writer. Based on the changes made, generate or update documentation: README sections, API docs, code comments, and changelog entries.
Always respond and explain your thoughts clearly in Thai language.`,
      `Summary:\n${state.summary}\n\nPlan:\n${state.plan}`,
      model
    );

    return {
      steps: [{ role: "Documentation", status: "done" as const, content: result.content, duration: result.duration }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Docs generation failed";
    return {
      steps: [{ role: "Documentation", status: "failed" as const, content: message }],
    };
  }
}

async function gitAgent(state: typeof AgentState.State) {
  const model = resolveModel(state.model, "coding");

  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a git automation agent. Review the changes made and use git tools to stage, commit, and push them. Write meaningful commit messages. Always respond in Thai language.`,
      },
      {
        role: "user",
        content: clampPrompt(
          `Summary of changes:\n${state.summary}\n\nPlan:\n${state.plan}\n\nTool results:\n${state.toolResults.join("\n")}\n\nRun git status first to see what changed, then git add and git commit with an appropriate message.`,
          FALLBACK_PROMPT_CHARS
        ),
      },
    ];

    const response = await runOllamaChat({
      messages,
      model,
      tools: toolDefinitions,
      options: { num_ctx: FALLBACK_OLLAMA_NUM_CTX, temperature: 0.1 },
    });

    const toolResults: string[] = [];
    if (response.message.tool_calls) {
      for (const tc of response.message.tool_calls) {
        const result = await executeTool(tc, state.workspaceId);
        toolResults.push(`${tc.function.name}: ${result.success ? "OK" : "FAIL"} - ${result.output.slice(0, 300)}`);
      }
    }

    const content = response.message.content;
    const extras = toolResults.length > 0 ? `\n---\nGit results:\n${toolResults.join("\n")}` : "";

    return {
      summary: state.summary || "Agent workflow completed.",
      steps: [{ role: "Git", status: "done" as const, content: content + extras }],
    };
  } catch {
    return {
      summary: state.summary || "Agent workflow completed.",
      steps: [{ role: "Git", status: "done" as const, content: "Use the Git tab to inspect status, diff, commit, and push from the selected workspace." }],
    };
  }
}

// ── Conditional Edges ───────────────────────────────────────────────────────

function shouldReviewOrFix(state: typeof AgentState.State) {
  return state.needsFix ? "fix" : "review";
}

function shouldCommitOrFix(state: typeof AgentState.State) {
  return state.needsFix ? "fix" : "security";
}

// ── Workflow ────────────────────────────────────────────────────────────────

export async function runOpenCodexWorkflow(input: AgentInput) {
  const graph = new StateGraph(AgentState)
    .addNode("planner", plannerAgent)
    .addNode("research", researchAgent)
    .addNode("architect", architectAgent)
    .addNode("coder", coderAgent)
    .addNode("review", reviewerAgent)
    .addNode("test", testerAgent)
    .addNode("fix", debuggerAgent)
    .addNode("security", securityAgent)
    .addNode("docs", documentationAgent)
    .addNode("commit", gitAgent)
    .addEdge(START, "planner")
    .addEdge("planner", "research")
    .addEdge("research", "architect")
    .addEdge("architect", "coder")
    .addConditionalEdges("coder", shouldReviewOrFix)
    .addEdge("review", "test")
    .addConditionalEdges("test", shouldCommitOrFix)
    .addEdge("fix", "coder")
    .addEdge("security", "docs")
    .addEdge("docs", "commit")
    .addEdge("commit", END)
    .compile();

  return graph.invoke({
    prompt: input.prompt,
    workspaceId: input.workspaceId,
    mode: input.mode ?? "auto",
    activePath: input.activePath,
    model: input.model,
  });
}
