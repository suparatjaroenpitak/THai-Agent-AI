"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Boxes,
  Command,
  Files,
  GitPullRequestArrow,
  LayoutPanelLeft,
  Moon,
  Play,
  RefreshCw,
  Save,
  Search,
  Settings,
  SplitSquareHorizontal,
  Sun,
  Terminal,
  UploadCloud
} from "lucide-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CodeEditor } from "@/components/opencodex/code-editor";
import { TerminalPanel } from "@/components/opencodex/terminal-panel";
import { FileTree } from "@/components/opencodex/file-tree";
import { AgentChat, WorkflowPanel, type WorkflowStep } from "@/components/opencodex/agent-chat";
import { CommandPalette } from "@/components/opencodex/command-palette";
import { ProviderRouting, defaultModelConfig } from "@/components/opencodex/provider-routing";
import { StatusBar } from "@/components/opencodex/status-bar";
import type { EditorFile, ModelConfig, WorkspaceRecord, WorkspaceTreeNode } from "@/components/opencodex/types";

const railItems = [
  { label: "Explorer", icon: Files },
  { label: "Search", icon: Search },
  { label: "Agents", icon: Bot },
  { label: "GitHub", icon: GitPullRequestArrow },
  { label: "Sandbox", icon: Boxes },
  { label: "Terminal", icon: Terminal }
] as const;

const modelStorageKey = "opencodex.modelConfig";
const emptyEditorFile: EditorFile = {
  path: "",
  language: "text",
  content: "Select a file from the workspace explorer."
};

type RailItemLabel = (typeof railItems)[number]["label"];
type WorkspaceTab = "terminal" | "problems" | "diff";
type InspectorTab = "chat" | "workflow" | "models";

function findFirstFile(nodes: WorkspaceTreeNode[]): string | undefined {
  for (const node of nodes) {
    if (node.kind === "file") return node.path;
    const child = node.children ? findFirstFile(node.children) : undefined;
    if (child) return child;
  }

  return undefined;
}

function getRunCommand(path: string) {
  if (path.endsWith(".test.ts") || path.endsWith(".test.tsx")) return "bun test";
  if (path.endsWith("schema.ts")) return "bun run db:generate";
  if (path.endsWith("docker-compose.yml")) return "docker compose config";
  if (path.endsWith("package.json")) return "bun run typecheck";
  return "bun run typecheck";
}

function parseStoredModelConfig() {
  if (typeof window === "undefined") return defaultModelConfig;

  try {
    const raw = window.localStorage.getItem(modelStorageKey);
    if (!raw) return defaultModelConfig;
    const parsed = JSON.parse(raw) as Partial<ModelConfig>;

    return {
      model: parsed.model || defaultModelConfig.model,
      reasoningModel: parsed.reasoningModel || defaultModelConfig.reasoningModel,
      codingModel: parsed.codingModel || defaultModelConfig.codingModel,
      embedModel: parsed.embedModel || defaultModelConfig.embedModel
    };
  } catch {
    return defaultModelConfig;
  }
}

export function OpenCodexShell() {
  const [activeRail, setActiveRail] = useState<RailItemLabel>("Explorer");
  const [commandOpen, setCommandOpen] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("terminal");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("chat");
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("current-workspace");
  const [workspaceTree, setWorkspaceTree] = useState<WorkspaceTreeNode[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [openFileTabs, setOpenFileTabs] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState("");
  const [editorFile, setEditorFile] = useState<EditorFile>(emptyEditorFile);
  const [dirtyFiles, setDirtyFiles] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    src: true,
    app: true,
    components: true
  });
  const [terminalLines, setTerminalLines] = useState<string[]>(["OpenCodex terminal", "$ "]);
  const [terminalBusy, setTerminalBusy] = useState(false);
  const [gitOutput, setGitOutput] = useState("Git status will appear here.");
  const [modelConfig, setModelConfig] = useState<ModelConfig>(defaultModelConfig);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const { resolvedTheme, setTheme } = useTheme();

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0],
    [activeWorkspaceId, workspaces]
  );
  const isDirty = activeFile ? dirtyFiles[activeFile] : false;

  useEffect(() => {
    setThemeReady(true);
    setModelConfig(parseStoredModelConfig());
    void loadWorkspaces();
  }, []);

  useEffect(() => {
    if (themeReady) {
      window.localStorage.setItem(modelStorageKey, JSON.stringify(modelConfig));
    }
  }, [modelConfig, themeReady]);

  useEffect(() => {
    if (activeWorkspaceId) {
      void loadWorkspaceTree(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveActiveFile();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeFile, editorFile, activeWorkspaceId]);

  async function loadWorkspaces(selectWorkspaceId?: string) {
    const response = await fetch("/api/workspaces");
    const data = (await response.json()) as { workspaces: WorkspaceRecord[] };
    setWorkspaces(data.workspaces ?? []);

    const nextWorkspaceId = selectWorkspaceId ?? activeWorkspaceId ?? data.workspaces?.[0]?.id ?? "current-workspace";
    setActiveWorkspaceId(nextWorkspaceId);
  }

  async function loadWorkspaceTree(workspaceId: string) {
    setWorkspaceLoading(true);

    try {
      const response = await fetch(`/api/workspaces/files?workspaceId=${encodeURIComponent(workspaceId)}`);
      const data = (await response.json()) as { tree: WorkspaceTreeNode[] };
      const nextTree = data.tree ?? [];
      setWorkspaceTree(nextTree);

      const firstFile = findFirstFile(nextTree);
      if (firstFile) {
        await openFile(firstFile, workspaceId);
      } else {
        setOpenFileTabs([]);
        setActiveFile("");
        setEditorFile(emptyEditorFile);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load workspace";
      setWorkspaceTree([]);
      setEditorFile({ path: "", language: "text", content: message });
    } finally {
      setWorkspaceLoading(false);
    }
  }

  function appendTerminalOutput(command: string, output: string) {
    const lines = output.trim() ? output.replace(/\r/g, "").split("\n") : ["<no output>"];

    setTerminalLines((current) => {
      const withoutPrompt = current.at(-1) === "$ " ? current.slice(0, -1) : current;
      return [...withoutPrompt, `$ ${command}`, ...lines, "$ "];
    });
  }

  async function openFile(path: string, workspaceId = activeWorkspaceId) {
    if (!path) return;

    const response = await fetch(
      `/api/workspaces/files?workspaceId=${encodeURIComponent(workspaceId)}&path=${encodeURIComponent(path)}`
    );
    const data = (await response.json()) as { file: EditorFile };

    setActiveFile(path);
    setEditorFile(data.file);
    setOpenFileTabs((current) => (current.includes(path) ? current : [...current, path]));
    setActiveRail("Explorer");
  }

  function updateEditorContent(content: string) {
    if (!activeFile) return;
    setEditorFile((current) => ({ ...current, content }));
    setDirtyFiles((current) => ({ ...current, [activeFile]: true }));
  }

  function toggleFolder(path: string) {
    setExpandedFolders((current) => ({
      ...current,
      [path]: !(current[path] ?? true)
    }));
  }

  function resetWorkbench() {
    setActiveRail("Explorer");
    setWorkspaceTab("terminal");
    setInspectorTab("chat");
    void loadWorkspaceTree(activeWorkspaceId);
  }

  async function saveActiveFile() {
    if (!activeFile) return;

    const response = await fetch("/api/workspaces/files", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: activeWorkspaceId,
        path: activeFile,
        content: editorFile.content
      })
    });

    if (!response.ok) {
      appendTerminalOutput("save", await response.text());
      return;
    }

    const data = (await response.json()) as { file: EditorFile };
    setEditorFile(data.file);
    setDirtyFiles((current) => ({ ...current, [activeFile]: false }));
    appendTerminalOutput("save", `Saved ${activeFile}`);
  }

  async function bindLocalFolder() {
    const localPath = window.prompt("Project folder path");
    if (!localPath?.trim()) return;

    const response = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "local",
        path: localPath.trim()
      })
    });

    if (!response.ok) {
      appendTerminalOutput("workspace local", await response.text());
      return;
    }

    const data = (await response.json()) as { workspace: WorkspaceRecord };
    await loadWorkspaces(data.workspace.id);
    appendTerminalOutput("workspace local", `Bound ${data.workspace.rootPath}`);
  }

  async function cloneGithubRepository() {
    const repository = window.prompt("GitHub repository URL or owner/repo");
    if (!repository?.trim()) return;

    setActiveRail("GitHub");
    setWorkspaceTab("terminal");
    appendTerminalOutput("git clone", `Cloning ${repository.trim()}`);

    const response = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "github",
        repository: repository.trim()
      })
    });

    if (!response.ok) {
      appendTerminalOutput("git clone", await response.text());
      return;
    }

    const data = (await response.json()) as { workspace: WorkspaceRecord };
    await loadWorkspaces(data.workspace.id);
    appendTerminalOutput("git clone", `Ready at ${data.workspace.rootPath}`);
  }

  async function runTerminalCommand(command: string) {
    setTerminalBusy(true);
    setActiveRail("Terminal");
    setWorkspaceTab("terminal");

    try {
      const response = await fetch("/api/tools/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          command
        })
      });
      const data = (await response.json().catch(() => ({}))) as { stdout?: string; stderr?: string };
      const output = [data.stdout, data.stderr].filter(Boolean).join("\n");
      appendTerminalOutput(command, response.ok ? output : JSON.stringify(data));
    } catch (error) {
      appendTerminalOutput(command, error instanceof Error ? error.message : "Command failed");
    } finally {
      setTerminalBusy(false);
    }
  }

  async function runGitCommand(args: string[]) {
    const response = await fetch("/api/tools/git", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: activeWorkspaceId,
        args
      })
    });

    const data = (await response.json().catch(() => ({}))) as { stdout?: string; stderr?: string; command?: string };
    if (!response.ok) throw new Error(JSON.stringify(data));
    return [data.command, data.stdout, data.stderr].filter(Boolean).join("\n");
  }

  async function refreshGitStatus() {
    setActiveRail("GitHub");
    setWorkspaceTab("diff");

    try {
      const [status, diff] = await Promise.all([runGitCommand(["status", "--short"]), runGitCommand(["diff", "--stat"])]);
      setGitOutput([status, diff].filter(Boolean).join("\n\n") || "No Git changes.");
    } catch (error) {
      setGitOutput(error instanceof Error ? error.message : "Git command failed");
    }
  }

  function handleRailSelect(label: RailItemLabel) {
    setActiveRail(label);

    if (label === "Search") {
      setCommandOpen(true);
      return;
    }

    if (label === "Agents") {
      setInspectorTab("workflow");
      return;
    }

    if (label === "GitHub") {
      void refreshGitStatus();
      return;
    }

    if (label === "Sandbox") {
      setInspectorTab("models");
      setWorkspaceTab("terminal");
      return;
    }

    if (label === "Terminal") {
      setWorkspaceTab("terminal");
    }
  }

  function handleRun() {
    if (!activeFile) return;
    void runTerminalCommand(getRunCommand(activeFile));
  }

  function handleCommandSelection(label: string) {
    if (label === "Open local folder") {
      void bindLocalFolder();
      return;
    }

    if (label === "Clone GitHub repository") {
      void cloneGithubRepository();
      return;
    }

    if (label === "Run planner workflow") {
      setActiveRail("Agents");
      setInspectorTab("chat");
      return;
    }

    if (label === "Start sandbox terminal") {
      void runTerminalCommand("node -p \"process.cwd()\"");
      return;
    }

    if (label === "Generate database schema") {
      void runTerminalCommand("bun run db:generate");
      return;
    }

    if (label === "Run security review") {
      void runTerminalCommand("bun run typecheck");
      return;
    }

    if (label === "Debug failing tests") {
      void runTerminalCommand("bun test");
      return;
    }

    if (label === "Deploy Docker image") {
      void runTerminalCommand("docker compose config");
      return;
    }

    if (label === "Configure Ollama models") {
      setActiveRail("Agents");
      setInspectorTab("models");
      return;
    }

    if (label === "Run Vitest suite") {
      void runTerminalCommand("bun test");
      return;
    }

    if (label === "Ask Coder agent") {
      setActiveRail("Agents");
      setInspectorTab("chat");
    }
  }

  const isDarkTheme = themeReady ? resolvedTheme === "dark" : true;

  return (
    <TooltipProvider delayDuration={250}>
      <main className="flex h-screen min-h-[720px] w-full overflow-hidden bg-[#121212] text-zinc-100">
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} onSelect={handleCommandSelection} />

        <aside className="flex w-12 shrink-0 flex-col items-center border-r border-white/10 bg-[#181a1c] py-2">
          <button
            onClick={resetWorkbench}
            className="mb-3 flex size-8 items-center justify-center rounded-md bg-emerald-400 text-zinc-950"
          >
            <Command className="size-4" />
            <span className="sr-only">OpenCodex</span>
          </button>
          <div className="flex flex-1 flex-col gap-1">
            {railItems.map((item) => {
              const Icon = item.icon;
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleRailSelect(item.label)}
                      className={`flex size-9 items-center justify-center rounded-md ${
                        item.label === activeRail
                          ? "bg-white/[0.08] text-emerald-300"
                          : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
                      }`}
                    >
                      <Icon className="size-4" />
                      <span className="sr-only">{item.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
                disabled={!themeReady}
                className="flex size-9 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
              >
                {isDarkTheme ? <Sun className="size-4" /> : <Moon className="size-4" />}
                <span className="sr-only">Theme</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Theme</TooltipContent>
          </Tooltip>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-[#151719] px-3">
            <div className="flex min-w-0 items-center gap-2">
              <LayoutPanelLeft className="size-4 text-emerald-300" />
              <span className="truncate text-sm font-semibold">OpenCodex</span>
              <Badge variant={activeWorkspace?.status === "ready" ? "success" : "destructive"} className="hidden sm:inline-flex">
                {activeWorkspace?.kind ?? "workspace"}
              </Badge>
              <Badge variant="info" className="hidden md:inline-flex">
                {modelConfig.model}
              </Badge>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="chrome" size="sm" onClick={bindLocalFolder}>
                <UploadCloud className="size-3.5" />
                <span className="hidden sm:inline">Local</span>
              </Button>
              <Button variant="chrome" size="sm" onClick={cloneGithubRepository}>
                <GitPullRequestArrow className="size-3.5" />
                <span className="hidden sm:inline">GitHub</span>
              </Button>
              <Button variant="chrome" size="sm" onClick={() => setCommandOpen(true)}>
                <Command className="size-3.5" />
                <span className="hidden sm:inline">Command</span>
              </Button>
              <Button variant="chrome" size="sm" onClick={() => void saveActiveFile()} disabled={!activeFile || !isDirty}>
                <Save className="size-3.5" />
                <span className="hidden sm:inline">Save</span>
              </Button>
              <Button size="sm" onClick={handleRun} disabled={!activeFile || terminalBusy}>
                <Play className="size-3.5" />
                Run
              </Button>
            </div>
          </header>

          <PanelGroup direction="horizontal" className="min-h-0 flex-1">
            <Panel defaultSize={18} minSize={14} maxSize={28} className="min-w-[220px] border-r border-white/10 bg-[#16181a]">
              <div className="flex h-9 items-center justify-between border-b border-white/10 px-3">
                <span className="truncate text-xs font-semibold uppercase text-zinc-400">Explorer</span>
                <button onClick={() => void loadWorkspaceTree(activeWorkspaceId)} className="text-zinc-500 hover:text-zinc-200">
                  <RefreshCw className="size-3.5" />
                  <span className="sr-only">Refresh</span>
                </button>
              </div>
              <div className="flex h-10 items-center gap-2 border-b border-white/10 px-3">
                <select
                  value={activeWorkspaceId}
                  onChange={(event) => setActiveWorkspaceId(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-xs text-zinc-300 outline-none"
                >
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id} className="bg-[#16181a] text-zinc-100">
                      {workspace.name}
                    </option>
                  ))}
                </select>
                <Settings className="size-3.5 shrink-0 text-zinc-500" />
              </div>
              <FileTree
                tree={workspaceTree}
                loading={workspaceLoading}
                expandedFolders={expandedFolders}
                selectedPath={activeFile}
                onSelectFile={(path) => void openFile(path)}
                onToggleFolder={toggleFolder}
              />
            </Panel>

            <PanelResizeHandle className="w-1 bg-white/[0.04] transition-colors hover:bg-emerald-400/40" />

            <Panel defaultSize={54} minSize={32}>
              <PanelGroup direction="vertical" className="min-h-0">
                <Panel defaultSize={68} minSize={42}>
                  <section className="flex h-full min-h-0 flex-col bg-[#121212]">
                    <div className="flex h-9 shrink-0 items-center border-b border-white/10 bg-[#1b1d1f]">
                      {openFileTabs.map((tab) => (
                        <button
                          key={tab}
                          onClick={() => void openFile(tab)}
                          className={`flex h-full min-w-0 max-w-[260px] items-center gap-2 border-r border-white/10 px-3 text-xs ${
                            tab === activeFile ? "bg-[#121212] text-zinc-100" : "text-zinc-500 hover:text-zinc-200"
                          }`}
                        >
                          <span className="truncate">
                            {dirtyFiles[tab] ? "* " : ""}
                            {tab}
                          </span>
                        </button>
                      ))}
                      <button
                        onClick={() => setWorkspaceTab((current) => (current === "diff" ? "terminal" : "diff"))}
                        className="ml-auto flex h-full w-10 items-center justify-center text-zinc-500 hover:text-zinc-200"
                      >
                        <SplitSquareHorizontal className="size-4" />
                        <span className="sr-only">Split</span>
                      </button>
                    </div>
                    <div className="min-h-0 flex-1">
                      <CodeEditor
                        path={editorFile.path || "workspace"}
                        language={editorFile.language}
                        value={editorFile.content}
                        onChange={updateEditorContent}
                      />
                    </div>
                  </section>
                </Panel>

                <PanelResizeHandle className="h-1 bg-white/[0.04] transition-colors hover:bg-emerald-400/40" />

                <Panel defaultSize={32} minSize={18}>
                  <Tabs
                    value={workspaceTab}
                    onValueChange={(value) => {
                      setWorkspaceTab(value as WorkspaceTab);
                      if (value === "diff") void refreshGitStatus();
                    }}
                    className="flex h-full min-h-0 flex-col bg-[#111315]"
                  >
                    <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/10 px-2">
                      <TabsList className="h-7 bg-transparent p-0">
                        <TabsTrigger value="terminal" className="h-7 px-2 text-xs data-[state=active]:bg-white/[0.08]">
                          Terminal
                        </TabsTrigger>
                        <TabsTrigger value="problems" className="h-7 px-2 text-xs data-[state=active]:bg-white/[0.08]">
                          Problems
                        </TabsTrigger>
                        <TabsTrigger value="diff" className="h-7 px-2 text-xs data-[state=active]:bg-white/[0.08]">
                          Git Diff
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="terminal" className="m-0 min-h-0 flex-1">
                      <TerminalPanel lines={terminalLines} busy={terminalBusy} onRunCommand={runTerminalCommand} />
                    </TabsContent>
                    <TabsContent value="problems" className="m-0 min-h-0 flex-1 p-3 text-xs text-zinc-500">
                      {isDirty ? `${editorFile.path} has unsaved changes.` : `No active diagnostics for ${editorFile.path || "workspace"}`}
                    </TabsContent>
                    <TabsContent value="diff" className="m-0 min-h-0 flex-1 overflow-auto p-3">
                      <pre className="whitespace-pre-wrap text-xs leading-5 text-zinc-400">{gitOutput}</pre>
                    </TabsContent>
                  </Tabs>
                </Panel>
              </PanelGroup>
            </Panel>

            <PanelResizeHandle className="w-1 bg-white/[0.04] transition-colors hover:bg-emerald-400/40" />

            <Panel defaultSize={28} minSize={22} maxSize={38} className="min-w-[300px] border-l border-white/10">
              <Tabs
                value={inspectorTab}
                onValueChange={(value) => setInspectorTab(value as InspectorTab)}
                className="flex h-full min-h-0 flex-col bg-[#181a1c]"
              >
                <div className="flex h-9 shrink-0 items-center border-b border-white/10 px-2">
                  <TabsList className="h-7 bg-transparent p-0">
                    <TabsTrigger value="chat" className="h-7 px-2 text-xs data-[state=active]:bg-white/[0.08]">
                      Chat
                    </TabsTrigger>
                    <TabsTrigger value="workflow" className="h-7 px-2 text-xs data-[state=active]:bg-white/[0.08]">
                      Agents
                    </TabsTrigger>
                    <TabsTrigger value="models" className="h-7 px-2 text-xs data-[state=active]:bg-white/[0.08]">
                      Models
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="chat" className="m-0 min-h-0 flex-1">
                  <AgentChat
                    workspaceId={activeWorkspaceId}
                    activePath={activeFile || undefined}
                    modelConfig={modelConfig}
                    onWorkflowSteps={setWorkflowSteps}
                  />
                </TabsContent>
                <TabsContent value="workflow" className="m-0 min-h-0 flex-1">
                  <WorkflowPanel steps={workflowSteps} />
                </TabsContent>
                <TabsContent value="models" className="m-0 min-h-0 flex-1">
                  <ProviderRouting config={modelConfig} onChange={setModelConfig} />
                </TabsContent>
              </Tabs>
            </Panel>
          </PanelGroup>

          <StatusBar />
        </section>
      </main>
    </TooltipProvider>
  );
}
