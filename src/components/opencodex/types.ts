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
  baseUrl: string;
  apiKey: string;
};
