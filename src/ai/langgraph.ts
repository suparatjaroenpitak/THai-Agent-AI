import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { runOllamaChat, resolveModel, type RuntimeModelConfig, type ChatMessage } from "@/ai/model-client";
import { routeModel, type RoutingMode } from "@/ai/router";
import { collectWorkspaceContext } from "@/workspace/server-project";

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
});

// ── Helper ──────────────────────────────────────────────────────────────────

async function callOllama(
  systemPrompt: string,
  userContent: string,
  model: string
): Promise<{ content: string; duration: number }> {
  const start = Date.now();
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];

  const result = await runOllamaChat({ messages, model });
  return {
    content: result.message.content,
    duration: Date.now() - start,
  };
}

// ── Agents ──────────────────────────────────────────────────────────────────

async function plannerAgent(state: typeof AgentState.State) {
  const model = resolveModel(state.model, "reasoning");
  try {
    const result = await callOllama(
      "You are a senior engineering planner. Analyze the user's request and break it down into concrete execution steps. Output a numbered plan. Be concise.",
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
      "You are a software architect. Review the plan and workspace context. Propose the architecture, file structure, and key design decisions. Specify which files to create/modify and what changes are needed.",
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
    const result = await callOllama(
      "You are a senior coding agent. Work from the provided plan and repository context. Return concrete file edits, new files, and terminal commands to run. Include exact file paths and complete code — no placeholders or TODOs.",
      `Plan:\n${state.plan}\n\nArchitecture decisions from previous steps:\n${state.steps
        .filter((s) => s.role === "Architect")
        .map((s) => s.content)
        .join("\n")}\n\nWorkspace context:\n${state.context.slice(0, 24000)}`,
      model
    );

    return {
      needsFix: false,
      summary: result.content,
      steps: [{ role: "Coder", status: "done" as const, content: result.content, duration: result.duration }],
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
      "You are a code reviewer. Review the proposed changes for correctness, security, and best practices. Flag issues and suggest improvements. Be specific about file paths and line references.",
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
    const result = await callOllama(
      "You are a testing engineer. Based on the code changes, generate test cases, verification commands, and expected outcomes. Use bun test / vitest format.",
      `Code changes:\n${coderOutput.slice(0, 16000)}`,
      model
    );

    return {
      steps: [{ role: "Tester", status: "done" as const, content: result.content, duration: result.duration }],
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
    const result = await callOllama(
      "You are a debugging agent. Analyze the errors and propose fixes. Provide exact code patches.",
      `Errors:\n${failedSteps}\n\nPlan:\n${state.plan}`,
      model
    );

    return {
      needsFix: false,
      steps: [{ role: "Debugger", status: "done" as const, content: result.content, duration: result.duration }],
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
      "You are a security auditor. Review the code changes for security vulnerabilities: SQL injection, XSS, CSRF, secrets exposure, auth bypass, path traversal. Report findings with severity.",
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
      "You are a documentation writer. Based on the changes made, generate or update documentation: README sections, API docs, code comments, and changelog entries.",
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
  return {
    summary: state.summary || "Agent workflow completed.",
    steps: [
      {
        role: "Git",
        status: "done" as const,
        content: "Use the Git tab to inspect status, diff, commit, and push from the selected workspace.",
      },
    ],
  };
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
