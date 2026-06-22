"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Boxes,
  Command,
  Files,
  GitPullRequestArrow,
  LayoutPanelLeft,
  Moon,
  Play,
  Search,
  Settings,
  SplitSquareHorizontal,
  Sun,
  Terminal,
  UploadCloud
} from "lucide-react";
import { Panel, PanelGroup, PanelResizeHandle } from "resizable-panels";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CodeEditor } from "@/components/opencodex/code-editor";
import { TerminalPanel } from "@/components/opencodex/terminal-panel";
import { FileTree } from "@/components/opencodex/file-tree";
import { AgentChat, WorkflowPanel } from "@/components/opencodex/agent-chat";
import { CommandPalette } from "@/components/opencodex/command-palette";
import { ProviderRouting } from "@/components/opencodex/provider-routing";
import { StatusBar } from "@/components/opencodex/status-bar";
import { openTabs } from "@/components/opencodex/data";

const railItems = [
  { label: "Explorer", icon: Files, active: true },
  { label: "Search", icon: Search },
  { label: "Agents", icon: Bot },
  { label: "GitHub", icon: GitPullRequestArrow },
  { label: "Sandbox", icon: Boxes },
  { label: "Terminal", icon: Terminal }
];

export function OpenCodexShell() {
  const [commandOpen, setCommandOpen] = useState(false);
  const [localProject, setLocalProject] = useState("Cloud workspace");
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function connectLocalFolder() {
    if (!window.showDirectoryPicker) {
      setLocalProject("Desktop agent required");
      return;
    }

    const directory = await window.showDirectoryPicker({ id: "opencodex-project", mode: "readwrite" });
    setLocalProject(directory.name);
  }

  return (
    <TooltipProvider delayDuration={250}>
      <main className="flex h-screen min-h-[720px] w-full overflow-hidden bg-[#121212] text-zinc-100">
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

        <aside className="flex w-12 shrink-0 flex-col items-center border-r border-white/10 bg-[#181a1c] py-2">
          <button className="mb-3 flex size-8 items-center justify-center rounded-md bg-emerald-400 text-zinc-950">
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
                      className={`flex size-9 items-center justify-center rounded-md ${
                        item.active ? "bg-white/[0.08] text-emerald-300" : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
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
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="flex size-9 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
              >
                {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
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
              <Badge variant="success" className="hidden sm:inline-flex">
                Auto Routing
              </Badge>
              <Badge variant="info" className="hidden md:inline-flex">
                MCP Ready
              </Badge>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="chrome" size="sm" onClick={connectLocalFolder}>
                <UploadCloud className="size-3.5" />
                <span className="hidden sm:inline">Local</span>
              </Button>
              <Button variant="chrome" size="sm" onClick={() => setCommandOpen(true)}>
                <Command className="size-3.5" />
                <span className="hidden sm:inline">Command</span>
              </Button>
              <Button size="sm">
                <Play className="size-3.5" />
                Run
              </Button>
            </div>
          </header>

          <PanelGroup direction="horizontal" className="min-h-0 flex-1">
            <Panel defaultSize={18} minSize={14} maxSize={28} className="min-w-[220px] border-r border-white/10 bg-[#16181a]">
              <div className="flex h-9 items-center justify-between border-b border-white/10 px-3">
                <span className="truncate text-xs font-semibold uppercase text-zinc-400">Explorer</span>
                <Settings className="size-3.5 text-zinc-500" />
              </div>
              <div className="flex h-10 items-center gap-2 border-b border-white/10 px-3">
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{localProject}</span>
                <Badge variant="outline" className="border-white/10 text-[10px] text-zinc-500">
                  rw
                </Badge>
              </div>
              <FileTree />
            </Panel>

            <PanelResizeHandle className="w-1 bg-white/[0.04] transition-colors hover:bg-emerald-400/40" />

            <Panel defaultSize={54} minSize={32}>
              <PanelGroup direction="vertical" className="min-h-0">
                <Panel defaultSize={68} minSize={42}>
                  <section className="flex h-full min-h-0 flex-col bg-[#121212]">
                    <div className="flex h-9 shrink-0 items-center border-b border-white/10 bg-[#1b1d1f]">
                      {openTabs.map((tab, index) => (
                        <button
                          key={tab}
                          className={`flex h-full min-w-0 max-w-[260px] items-center gap-2 border-r border-white/10 px-3 text-xs ${
                            index === 0 ? "bg-[#121212] text-zinc-100" : "text-zinc-500 hover:text-zinc-200"
                          }`}
                        >
                          <span className="truncate">{tab}</span>
                        </button>
                      ))}
                      <button className="ml-auto flex h-full w-10 items-center justify-center text-zinc-500 hover:text-zinc-200">
                        <SplitSquareHorizontal className="size-4" />
                        <span className="sr-only">Split</span>
                      </button>
                    </div>
                    <div className="min-h-0 flex-1">
                      <CodeEditor />
                    </div>
                  </section>
                </Panel>

                <PanelResizeHandle className="h-1 bg-white/[0.04] transition-colors hover:bg-emerald-400/40" />

                <Panel defaultSize={32} minSize={18}>
                  <Tabs defaultValue="terminal" className="flex h-full min-h-0 flex-col bg-[#111315]">
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
                      <TerminalPanel />
                    </TabsContent>
                    <TabsContent value="problems" className="m-0 min-h-0 flex-1 p-3 text-xs text-zinc-500">
                      No active diagnostics
                    </TabsContent>
                    <TabsContent value="diff" className="m-0 min-h-0 flex-1 p-3 text-xs text-zinc-500">
                      Git diff will appear after the agent writes files
                    </TabsContent>
                  </Tabs>
                </Panel>
              </PanelGroup>
            </Panel>

            <PanelResizeHandle className="w-1 bg-white/[0.04] transition-colors hover:bg-emerald-400/40" />

            <Panel defaultSize={28} minSize={22} maxSize={38} className="min-w-[300px] border-l border-white/10">
              <Tabs defaultValue="chat" className="flex h-full min-h-0 flex-col bg-[#181a1c]">
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
                  <AgentChat />
                </TabsContent>
                <TabsContent value="workflow" className="m-0 min-h-0 flex-1">
                  <WorkflowPanel />
                </TabsContent>
                <TabsContent value="models" className="m-0 min-h-0 flex-1">
                  <ProviderRouting />
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
