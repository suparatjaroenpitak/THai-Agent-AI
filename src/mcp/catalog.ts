export type McpConnector = {
  name: string;
  category: "code" | "docs" | "chat" | "storage" | "design" | "database" | "cloud";
  transport: "stdio" | "http" | "sse";
  env: string[];
  tools: string[];
};

export const mcpCatalog: McpConnector[] = [
  { name: "GitHub", category: "code", transport: "stdio", env: ["GITHUB_TOKEN"], tools: ["repo", "issues", "pulls", "commits"] },
  { name: "Notion", category: "docs", transport: "http", env: ["NOTION_TOKEN"], tools: ["pages", "databases", "search"] },
  { name: "Linear", category: "code", transport: "http", env: ["LINEAR_API_KEY"], tools: ["issues", "projects", "cycles"] },
  { name: "Slack", category: "chat", transport: "http", env: ["SLACK_BOT_TOKEN"], tools: ["channels", "messages", "threads"] },
  { name: "Discord", category: "chat", transport: "http", env: ["DISCORD_BOT_TOKEN"], tools: ["guilds", "messages"] },
  { name: "Google Drive", category: "storage", transport: "http", env: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], tools: ["files", "docs", "sheets"] },
  { name: "Figma", category: "design", transport: "http", env: ["FIGMA_TOKEN"], tools: ["files", "components", "assets"] },
  { name: "Jira", category: "code", transport: "http", env: ["JIRA_TOKEN"], tools: ["issues", "sprints", "boards"] },
  { name: "Confluence", category: "docs", transport: "http", env: ["CONFLUENCE_TOKEN"], tools: ["spaces", "pages", "search"] },
  { name: "Postgres", category: "database", transport: "stdio", env: ["DATABASE_URL"], tools: ["query", "schema", "explain"] },
  { name: "Redis", category: "database", transport: "stdio", env: ["REDIS_URL"], tools: ["get", "set", "stream", "pubsub"] },
  { name: "S3", category: "storage", transport: "http", env: ["S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"], tools: ["objects", "presign"] },
  { name: "Cloudflare", category: "cloud", transport: "http", env: ["CLOUDFLARE_API_TOKEN"], tools: ["r2", "workers", "pages", "dns"] }
];
