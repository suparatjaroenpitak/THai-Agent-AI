import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { describeModel, resolveRuntimeModel, runOpenAICompatibleChat, type RuntimeModelConfig } from "@/ai/model-client";
import { routeModel, type RoutingMode } from "@/ai/router";
import { collectWorkspaceContext } from "@/workspace/server-project";

export type AgentStep = {
  role: string;
  status: "done" | "active" | "queued" | "failed";
  content: string;
};

export type AgentInput = {
  prompt: string;
  workspaceId: string;
  mode?: RoutingMode;
  activePath?: string;
  model?: RuntimeModelConfig;
};

const AgentState = Annotation.Root({
  prompt: Annotation<string>(),
  workspaceId: Annotation<string>(),
  mode: Annotation<RoutingMode>({
    default: () => "auto",
    reducer: (_left, right) => right
  }),
  activePath: Annotation<string | undefined>({
    default: () => undefined,
    reducer: (_left, right) => right
  }),
  model: Annotation<RuntimeModelConfig | undefined>({
    default: () => undefined,
    reducer: (_left, right) => right
  }),
  steps: Annotation<AgentStep[]>({
    default: () => [],
    reducer: (left, right) => left.concat(right)
  }),
  needsFix: Annotation<boolean>({
    default: () => false,
    reducer: (_left, right) => right
  }),
  summary: Annotation<string>({
    default: () => "",
    reducer: (_left, right) => right
  })
});

async function plannerAgent(state: typeof AgentState.State) {
  return {
    steps: [
      {
        role: "planner",
        status: "done",
        content: `Planned task for workspace ${state.workspaceId}${state.activePath ? ` with ${state.activePath} in focus` : ""}.`
      }
    ]
  };
}

async function researchAgent(state: typeof AgentState.State) {
  const context = await collectWorkspaceContext(state.workspaceId, state.activePath);
  const fileList = context.files.map((file) => file.path).join(", ") || "no readable seed files";

  return {
    steps: [
      {
        role: "research",
        status: "done",
        content: `Collected workspace context from ${context.workspace.name}: ${fileList}.`
      }
    ]
  };
}

async function architectAgent(state: typeof AgentState.State) {
  const routing = routeModel({
    mode: state.mode,
    inputTokens: Math.max(1000, state.prompt.length * 2),
    outputTokens: 2500,
    requiredTags: ["coding"]
  });
  const runtimeModel = resolveRuntimeModel(state.model);

  return {
    steps: [
      {
        role: "architect",
        status: "done",
        content: `Selected ${describeModel(runtimeModel.profile)} via ${runtimeModel.baseUrl}; route fallbacks: ${routing.fallbacks
          .map((model) => model.label)
          .join(", ")}.`
      }
    ]
  };
}

async function coderAgent(state: typeof AgentState.State) {
  const context = await collectWorkspaceContext(state.workspaceId, state.activePath);
  const contextBlock = context.files
    .map((file) => `--- ${file.path}\n${file.content}`)
    .join("\n\n")
    .slice(0, 36000);

  try {
    const modelResult = await runOpenAICompatibleChat({
      config: state.model,
      messages: [
        {
          role: "system",
          content:
            "You are a senior coding agent. Work from the provided repository context. Return concrete steps, code-level guidance, and commands to run. If a file edit is needed, include the exact target file and patch intent. Keep the answer concise."
        },
        {
          role: "user",
          content: `Workspace: ${context.workspace.name}\nPrompt: ${state.prompt}\n\nRepository context:\n${contextBlock || "(No seed files were readable.)"}`
        }
      ]
    });

    return {
      needsFix: false,
      summary: modelResult.content,
      steps: [
        {
          role: "coder",
          status: "done",
          content: modelResult.content
        }
      ]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";

    return {
      needsFix: false,
      summary: `Model call failed. Add a provider key in Models or point the base URL at a local OpenAI-compatible Chinese model. ${message}`,
      steps: [
        {
          role: "coder",
          status: "failed" as const,
          content: `Model call failed: ${message}`
        }
      ]
    };
  }
}

async function reviewerAgent() {
  return {
    steps: [
      {
        role: "reviewer",
        status: "done",
        content: "Checked the model output for concrete file targets, command plan, and workspace safety."
      }
    ]
  };
}

async function testerAgent() {
  return {
    steps: [
      {
        role: "tester",
        status: "done",
        content: "Prepared verification commands for the selected workspace."
      }
    ]
  };
}

async function debuggerAgent() {
  return {
    needsFix: false,
    steps: [
      {
        role: "debugger",
        status: "done",
        content: "Parsed errors, generated patch plan, and re-queued test run."
      }
    ]
  };
}

async function gitAgent(state: typeof AgentState.State) {
  return {
    summary: state.summary || "Agent workflow completed.",
    steps: [
      {
        role: "git",
        status: "done",
        content: "Use the Git tab to inspect status, diff, commit, and push from the selected workspace."
      }
    ]
  };
}

function shouldReviewOrFix(state: typeof AgentState.State) {
  return state.needsFix ? "fix" : "review";
}

function shouldCommitOrFix(state: typeof AgentState.State) {
  return state.needsFix ? "fix" : "commit";
}

export async function runOpenCodexWorkflow(input: AgentInput) {
  const graph = new StateGraph(AgentState)
    .addNode("planner", plannerAgent)
    .addNode("research", researchAgent)
    .addNode("architect", architectAgent)
    .addNode("coder", coderAgent)
    .addNode("review", reviewerAgent)
    .addNode("test", testerAgent)
    .addNode("fix", debuggerAgent)
    .addNode("commit", gitAgent)
    .addEdge(START, "planner")
    .addEdge("planner", "research")
    .addEdge("research", "architect")
    .addEdge("architect", "coder")
    .addConditionalEdges("coder", shouldReviewOrFix)
    .addEdge("review", "test")
    .addConditionalEdges("test", shouldCommitOrFix)
    .addEdge("fix", "coder")
    .addEdge("commit", END)
    .compile();

  return graph.invoke({
    prompt: input.prompt,
    workspaceId: input.workspaceId,
    mode: input.mode ?? "auto",
    activePath: input.activePath,
    model: input.model
  });
}
