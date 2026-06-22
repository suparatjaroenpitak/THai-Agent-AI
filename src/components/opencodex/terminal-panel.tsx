"use client";

import { useEffect, useRef } from "react";
import type { Terminal as XtermTerminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

export function TerminalPanel() {
  const terminalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;
    let terminal: XtermTerminal | undefined;
    let fitAddon: FitAddon | undefined;

    async function mountTerminal() {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit")
      ]);

      if (!terminalRef.current || disposed) return;

      terminal = new Terminal({
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
      fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(terminalRef.current);
      fitAddon.fit();
      terminal.writeln("OpenCodex sandbox");
      terminal.writeln("$ bun install");
      terminal.writeln("$ bun run db:migrate");
      terminal.writeln("$ bun run dev");
      terminal.write("$ ");
    }

    mountTerminal();
    const onResize = () => fitAddon?.fit();
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      fitAddon?.dispose?.();
      terminal?.dispose();
    };
  }, []);

  return <div ref={terminalRef} className="h-full w-full overflow-hidden bg-[#111315] p-2" />;
}
