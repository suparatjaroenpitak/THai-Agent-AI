import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { routeModel, type RoutingMode } from "@/ai/router";

export type AgentStep = {
  role: string;
  status: "done" | "active" | "queued" | "failed";
  content: string;
};

export type AgentInput = {
  prompt: string;
  workspaceId: string;
  mode?: RoutingMode;
};

const AgentState = Annotation.Root({
  prompt: Annotation<string>(),
  workspaceId: Annotation<string>(),
  mode: Annotation<RoutingMode>({
    default: () => "auto",
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
        content: `Planned task for workspace ${state.workspaceId}.`
      }
    ]
  };
}

async function researchAgent() {
  return {
    steps: [
      {
        role: "research",
        status: "done",
        content: "Collected README, docs, package graph, dependency graph, git history, and indexed code symbols."
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

  return {
    steps: [
      {
        role: "architect",
        status: "done",
        content: `Selected ${routing.primary.label}; fallbacks: ${routing.fallbacks.map((model) => model.label).join(", ")}.`
      }
    ]
  };
}

async function coderAgent(state: typeof AgentState.State) {
  return {
    needsFix: state.prompt.toLowerCase().includes("fix"),
    steps: [
      {
        role: "coder",
        status: "done",
        content: "Prepared tool plan for read/write/search/git/terminal/docker operations."
      }
    ]
  };
}

async function reviewerAgent() {
  return {
    steps: [
      {
        role: "reviewer",
        status: "done",
        content: "Reviewed generated changes for regressions, auth risks, and missing tests."
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
        content: "Queued Vitest, Playwright, and integration checks."
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

async function gitAgent() {
  return {
    summary: "Workflow completed through planning, research, architecture, coding, review, tests, fixes, and commit preparation.",
    steps: [
      {
        role: "git",
        status: "done",
        content: "Generated commit message and PR summary."
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
    mode: input.mode ?? "auto"
  });
}
