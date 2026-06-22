"use client";

import dynamic from "next/dynamic";
import { sampleCode } from "@/components/opencodex/data";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.Editor), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#121212] text-sm text-zinc-400">
      Loading editor
    </div>
  )
});

export function CodeEditor() {
  return (
    <MonacoEditor
      height="100%"
      defaultLanguage="typescript"
      defaultValue={sampleCode}
      theme="vs-dark"
      options={{
        fontSize: 13,
        fontLigatures: true,
        minimap: { enabled: true },
        smoothScrolling: true,
        wordWrap: "on",
        padding: { top: 18, bottom: 18 },
        scrollBeyondLastLine: false,
        tabSize: 2,
        renderLineHighlight: "all",
        automaticLayout: true
      }}
    />
  );
}
