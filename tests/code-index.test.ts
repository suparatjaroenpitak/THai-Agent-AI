import { describe, expect, it } from "vitest";
import { indexCodeFile } from "@/ai/code-index";

describe("code index", () => {
  it("extracts imports, exports, and symbols", () => {
    const result = indexCodeFile(
      "src/example.ts",
      `import { z } from "zod";
export function parseThing() {
  return z.string();
}
class WorkerPool {}`
    );

    expect(result.language).toBe("typescript");
    expect(result.imports).toContain("zod");
    expect(result.exports).toContain("parseThing");
    expect(result.symbols.some((symbol) => symbol.name === "WorkerPool")).toBe(true);
  });
});
