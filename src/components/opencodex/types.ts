export type WorkspaceKind = "local" | "desktop_agent" | "github" | "cloud";

export type WorkspaceRecord = {
  id: string;
  name: string;
  kind: WorkspaceKind;
  rootPath: string;
  repository?: string;
  branch?: string;
  status: "ready" | "cloning" | "missing";
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceTreeNode = {
  name: string;
  path: string;
  kind: "file" | "directory";
  children?: WorkspaceTreeNode[];
};

export type EditorFile = {
  path: string;
  language: string;
  content: string;
  size?: number;
  updatedAt?: string;
};

export type ModelConfig = {
  model: string;
  reasoningModel: string;
  codingModel: string;
  embedModel: string;
};

export type OllamaModelInfo = {
  id: string;
  label: string;
  provider: "ollama";
  parameterSize: string;
  family: string;
  quantization: string;
  sizeBytes: number;
  tags: string[];
};

export type StreamChunkEvent = {
  type: "chunk";
  content: string;
  done: boolean;
  model: string;
};

export type StreamToolCallEvent = {
  type: "tool_call";
  tool: string;
  arguments: Record<string, unknown>;
};

export type StreamDoneEvent = {
  type: "done";
  model: string;
  totalDuration?: number;
  promptTokens?: number;
  completionTokens?: number;
  evalDuration?: number;
};

export type StreamErrorEvent = {
  type: "error";
  error: string;
};

export type StreamEvent = StreamChunkEvent | StreamToolCallEvent | StreamDoneEvent | StreamErrorEvent | { type: "aborted" };
