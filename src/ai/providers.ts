export type ProviderKind =
  | "deepseek"
  | "qwen"
  | "glm"
  | "kimi"
  | "internlm"
  | "yi"
  | "baichuan"
  | "moonshot"
  | "minimax"
  | "doubao"
  | "zhipu"
  | "openrouter"
  | "siliconflow"
  | "dashscope"
  | "together"
  | "groq"
  | "openai_compatible";

export type ModelProfile = {
  id: string;
  label: string;
  provider: ProviderKind;
  baseUrl: string;
  contextWindow: number;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  tags: Array<"coding" | "reasoning" | "fast" | "cheap" | "long-context" | "tool-use">;
};

const defaultCompatibleBaseUrl = "https://api.deepseek.com/v1";
const defaultCompatibleModel = "deepseek-chat";

export const modelCatalog: ModelProfile[] = [
  {
    id: "deepseek-chat",
    label: "DeepSeek V3",
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    contextWindow: 64000,
    inputCostPerMillion: 0.27,
    outputCostPerMillion: 1.1,
    tags: ["coding", "cheap", "tool-use"]
  },
  {
    id: "deepseek-reasoner",
    label: "DeepSeek R1",
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    contextWindow: 64000,
    inputCostPerMillion: 0.55,
    outputCostPerMillion: 2.19,
    tags: ["reasoning", "coding", "tool-use"]
  },
  {
    id: "qwen3-coder-plus",
    label: "Qwen Coder",
    provider: "dashscope",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    contextWindow: 128000,
    inputCostPerMillion: 0.35,
    outputCostPerMillion: 1.4,
    tags: ["coding", "long-context", "tool-use"]
  },
  {
    id: "qwen3-max",
    label: "Qwen3",
    provider: "dashscope",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    contextWindow: 128000,
    inputCostPerMillion: 0.5,
    outputCostPerMillion: 2,
    tags: ["reasoning", "long-context"]
  },
  {
    id: "glm-4-plus",
    label: "GLM-4",
    provider: "zhipu",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    contextWindow: 128000,
    inputCostPerMillion: 0.7,
    outputCostPerMillion: 0.7,
    tags: ["reasoning", "tool-use"]
  },
  {
    id: "kimi-k2",
    label: "Kimi K2",
    provider: "moonshot",
    baseUrl: "https://api.moonshot.cn/v1",
    contextWindow: 128000,
    inputCostPerMillion: 0.6,
    outputCostPerMillion: 2.5,
    tags: ["coding", "long-context"]
  },
  {
    id: "internlm3-latest",
    label: "InternLM",
    provider: "openai_compatible",
    baseUrl: defaultCompatibleBaseUrl,
    contextWindow: 32000,
    inputCostPerMillion: 0.1,
    outputCostPerMillion: 0.4,
    tags: ["cheap"]
  },
  {
    id: "yi-large",
    label: "Yi",
    provider: "openai_compatible",
    baseUrl: defaultCompatibleBaseUrl,
    contextWindow: 32000,
    inputCostPerMillion: 0.3,
    outputCostPerMillion: 0.3,
    tags: ["fast"]
  },
  {
    id: "baichuan4",
    label: "Baichuan",
    provider: "openai_compatible",
    baseUrl: defaultCompatibleBaseUrl,
    contextWindow: 32000,
    inputCostPerMillion: 0.3,
    outputCostPerMillion: 1,
    tags: ["fast"]
  },
  {
    id: "minimax-text-01",
    label: "MiniMax",
    provider: "minimax",
    baseUrl: "https://api.minimax.chat/v1",
    contextWindow: 1000000,
    inputCostPerMillion: 0.2,
    outputCostPerMillion: 1.1,
    tags: ["long-context", "cheap"]
  },
  {
    id: "doubao-pro-32k",
    label: "Doubao",
    provider: "doubao",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    contextWindow: 32000,
    inputCostPerMillion: 0.11,
    outputCostPerMillion: 0.55,
    tags: ["cheap", "fast"]
  },
  {
    id: "moonshot-v1-128k",
    label: "Moonshot",
    provider: "moonshot",
    baseUrl: "https://api.moonshot.cn/v1",
    contextWindow: 128000,
    inputCostPerMillion: 1,
    outputCostPerMillion: 1,
    tags: ["long-context"]
  },
  {
    id: "openrouter/auto",
    label: "OpenRouter Auto",
    provider: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    contextWindow: 200000,
    inputCostPerMillion: 0.2,
    outputCostPerMillion: 0.8,
    tags: ["tool-use", "cheap"]
  },
  {
    id: "siliconflow/qwen",
    label: "SiliconFlow",
    provider: "siliconflow",
    baseUrl: "https://api.siliconflow.cn/v1",
    contextWindow: 128000,
    inputCostPerMillion: 0.1,
    outputCostPerMillion: 0.4,
    tags: ["cheap", "fast"]
  },
  {
    id: "together/qwen-coder",
    label: "Together AI",
    provider: "together",
    baseUrl: "https://api.together.xyz/v1",
    contextWindow: 128000,
    inputCostPerMillion: 0.2,
    outputCostPerMillion: 0.6,
    tags: ["coding", "fast"]
  },
  {
    id: "groq/llama-fast",
    label: "Groq",
    provider: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    contextWindow: 128000,
    inputCostPerMillion: 0.05,
    outputCostPerMillion: 0.08,
    tags: ["fast", "cheap"]
  },
  {
    id: defaultCompatibleModel,
    label: "OpenAI Compatible API",
    provider: "openai_compatible",
    baseUrl: defaultCompatibleBaseUrl,
    contextWindow: 128000,
    inputCostPerMillion: 0,
    outputCostPerMillion: 0,
    tags: ["coding", "tool-use"]
  }
];
