"use client";

import { useEffect, useRef, useState } from "react";
import type { Terminal as XtermTerminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

const defaultTerminalLines = ["OpenCodex terminal", "$ "];

export function TerminalPanel({
  lines = defaultTerminalLines,
  busy,
  onRunCommand
}: {
  lines?: string[];
  busy?: boolean;
  onRunCommand?: (command: string) => void;
}) {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const terminalInstanceRef = useRef<XtermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [command, setCommand] = useState("");

  function renderLines(nextLines: string[], terminal = terminalInstanceRef.current) {
    if (!terminal) return;

    terminal.reset();
    nextLines.forEach((line) => {
      terminal.writeln(line);
    });
  }

  useEffect(() => {
    let disposed = false;

    async function mountTerminal() {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit")
      ]);

      if (!terminalRef.current || disposed) return;

      const terminal = new Terminal({
        cursorBlink: true,
        convertEol: true,
        fontFamily: "JetBrains Mono, Consolas, monospace",
        fontSize: 12,
        theme: {
          background: "#111315",
          foreground: "#f3f4ef",
          cursor: "#5ee0a0",
          selectionBackground: "#3b4a45"
        }
      });
      const fitAddon = new FitAddon();
      terminalInstanceRef.current = terminal;
      fitAddonRef.current = fitAddon;
      terminal.loadAddon(fitAddon);
      terminal.open(terminalRef.current);
      fitAddon.fit();
      renderLines(lines, terminal);
    }

    mountTerminal();
    const onResize = () => fitAddonRef.current?.fit();
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      fitAddonRef.current?.dispose?.();
      terminalInstanceRef.current?.dispose();
      fitAddonRef.current = null;
      terminalInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    renderLines(lines);
  }, [lines]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#111315]">
      <div ref={terminalRef} className="min-h-0 flex-1 overflow-hidden p-2" />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = command.trim();
          if (!trimmed || busy) return;
          setCommand("");
          onRunCommand?.(trimmed);
        }}
        className="flex h-9 shrink-0 items-center border-t border-white/10 bg-black/20 px-2"
      >
        <span className="mr-2 text-xs text-emerald-300">$</span>
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          disabled={busy}
          className="min-w-0 flex-1 bg-transparent text-xs text-zinc-100 outline-none placeholder:text-zinc-600"
          placeholder={busy ? "Running" : "Type a command"}
        />
      </form>
    </div>
  );
}
