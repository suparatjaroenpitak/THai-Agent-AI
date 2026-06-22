export type CodeSymbol = {
  name: string;
  kind: "class" | "function" | "variable" | "import" | "export";
  line: number;
};

export type CodeIndexResult = {
  path: string;
  language: string;
  imports: string[];
  exports: string[];
  symbols: CodeSymbol[];
};

const languageByExtension: Record<string, string> = {
  ts: "typescript",
  tsx: "typescriptreact",
  js: "javascript",
  jsx: "javascriptreact",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  md: "markdown",
  css: "css",
  sql: "sql",
  dockerfile: "dockerfile",
  yml: "yaml",
  yaml: "yaml"
};

export function detectLanguage(path: string) {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (path.toLowerCase().endsWith("dockerfile")) return "dockerfile";
  return languageByExtension[extension] ?? "text";
}

export function indexCodeFile(path: string, content: string): CodeIndexResult {
  const imports: string[] = [];
  const exports: string[] = [];
  const symbols: CodeSymbol[] = [];

  content.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1;
    const importMatch = line.match(/import\s+(?:.+?\s+from\s+)?["'](.+?)["']/);
    const exportMatch = line.match(/export\s+(?:default\s+)?(?:class|function|const|let|var|type|interface)?\s*([A-Za-z0-9_$]+)?/);
    const functionMatch = line.match(/(?:function|const)\s+([A-Za-z0-9_$]+)\s*(?:=|\()/);
    const classMatch = line.match(/class\s+([A-Za-z0-9_$]+)/);

    if (importMatch?.[1]) {
      imports.push(importMatch[1]);
      symbols.push({ name: importMatch[1], kind: "import", line: lineNumber });
    }
    if (exportMatch?.[1]) {
      exports.push(exportMatch[1]);
      symbols.push({ name: exportMatch[1], kind: "export", line: lineNumber });
    }
    if (functionMatch?.[1]) {
      symbols.push({ name: functionMatch[1], kind: "function", line: lineNumber });
    }
    if (classMatch?.[1]) {
      symbols.push({ name: classMatch[1], kind: "class", line: lineNumber });
    }
  });

  return {
    path,
    language: detectLanguage(path),
    imports,
    exports,
    symbols
  };
}
