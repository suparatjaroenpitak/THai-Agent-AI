"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.Editor), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#121212] text-sm text-zinc-400">
      Loading editor
    </div>
  )
});

export function CodeEditor({
  path,
  language,
  value,
  onChange
}: {
  path: string;
  language: string;
  value: string;
  onChange?: (value: string) => void;
}) {
  return (
    <MonacoEditor
      key={path}
      height="100%"
      path={path}
      defaultLanguage={language}
      defaultValue={value}
      theme="vs-dark"
      onChange={(nextValue) => onChange?.(nextValue ?? "")}
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
