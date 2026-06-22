import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const workspaceKind = pgEnum("workspace_kind", ["local", "desktop_agent", "github", "cloud"]);
export const taskStatus = pgEnum("task_status", ["queued", "running", "blocked", "failed", "completed", "cancelled"]);
export const agentRole = pgEnum("agent_role", [
  "architect",
  "planner",
  "coder",
  "reviewer",
  "refactor",
  "debugger",
  "tester",
  "security",
  "documentation",
  "devops",
  "research",
  "database",
  "frontend",
  "backend",
  "mobile",
  "api"
]);
export const memoryScope = pgEnum("memory_scope", ["short", "long", "project", "user", "conversation"]);
export const providerKind = pgEnum("provider_kind", [
  "deepseek",
  "qwen",
  "glm",
  "kimi",
  "internlm",
  "yi",
  "baichuan",
  "moonshot",
  "minimax",
  "doubao",
  "zhipu",
  "openrouter",
  "siliconflow",
  "dashscope",
  "together",
  "groq",
  "openai_compatible"
]);
export const toolCallStatus = pgEnum("tool_call_status", ["pending", "approved", "running", "failed", "completed", "cancelled"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
  },
  (table) => ({
    userIdx: index("session_user_idx").on(table.userId)
  })
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdx: index("account_user_idx").on(table.userId),
    providerAccountIdx: uniqueIndex("account_provider_account_idx").on(table.providerId, table.accountId)
  })
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const providerCredential = pgTable(
  "provider_credential",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: providerKind("kind").notNull(),
    displayName: text("display_name").notNull(),
    baseUrl: text("base_url").notNull(),
    apiKeyEncrypted: text("api_key_encrypted").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    priority: integer("priority").notNull().default(100),
    rpmLimit: integer("rpm_limit"),
    inputCostPerMillion: numeric("input_cost_per_million", { precision: 10, scale: 6 }).notNull().default("0"),
    outputCostPerMillion: numeric("output_cost_per_million", { precision: 10, scale: 6 }).notNull().default("0"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userKindIdx: index("provider_credential_user_kind_idx").on(table.userId, table.kind)
  })
);

export const workspace = pgTable(
  "workspace",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: workspaceKind("kind").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    localHandleId: text("local_handle_id"),
    githubOwner: text("github_owner"),
    githubRepo: text("github_repo"),
    defaultBranch: text("default_branch").default("main"),
    containerImage: text("container_image"),
    storagePrefix: text("storage_prefix"),
    lastIndexedAt: timestamp("last_indexed_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    ownerIdx: index("workspace_owner_idx").on(table.ownerId),
    slugIdx: uniqueIndex("workspace_owner_slug_idx").on(table.ownerId, table.slug)
  })
);

export const projectFileIndex = pgTable(
  "project_file_index",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    kind: text("kind").notNull(),
    language: text("language"),
    contentHash: text("content_hash").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    imports: jsonb("imports").$type<string[]>().notNull().default([]),
    exports: jsonb("exports").$type<string[]>().notNull().default([]),
    symbols: jsonb("symbols").$type<Array<{ name: string; kind: string; line?: number }>>().notNull().default([]),
    dependencyEdges: jsonb("dependency_edges").$type<string[]>().notNull().default([]),
    embeddingRef: text("embedding_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    workspacePathIdx: uniqueIndex("project_file_index_workspace_path_idx").on(table.workspaceId, table.path),
    workspaceLanguageIdx: index("project_file_index_workspace_language_idx").on(table.workspaceId, table.language)
  })
);

export const memory = pgTable(
  "memory",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").references(() => workspace.id, { onDelete: "cascade" }),
    scope: memoryScope("scope").notNull(),
    content: text("content").notNull(),
    summary: text("summary"),
    embeddingRef: text("embedding_ref"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userScopeIdx: index("memory_user_scope_idx").on(table.userId, table.scope),
    workspaceScopeIdx: index("memory_workspace_scope_idx").on(table.workspaceId, table.scope)
  })
);

export const conversation = pgTable(
  "conversation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled task"),
    activeModel: text("active_model"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdx: index("conversation_user_idx").on(table.userId),
    workspaceIdx: index("conversation_workspace_idx").on(table.workspaceId)
  })
);

export const message = pgTable(
  "message",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    reasoning: text("reasoning"),
    artifacts: jsonb("artifacts").$type<Array<{ type: string; url?: string; path?: string }>>().notNull().default([]),
    tokenInput: integer("token_input").notNull().default(0),
    tokenOutput: integer("token_output").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    conversationIdx: index("message_conversation_idx").on(table.conversationId)
  })
);

export const task = pgTable(
  "task",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => conversation.id, { onDelete: "set null" }),
    status: taskStatus("status").notNull().default("queued"),
    title: text("title").notNull(),
    objective: text("objective").notNull(),
    progress: integer("progress").notNull().default(0),
    queueKey: text("queue_key"),
    retryCount: integer("retry_count").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    workspaceStatusIdx: index("task_workspace_status_idx").on(table.workspaceId, table.status)
  })
);

export const agentRun = pgTable(
  "agent_run",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    role: agentRole("role").notNull(),
    status: taskStatus("status").notNull().default("queued"),
    model: text("model"),
    providerId: uuid("provider_id").references(() => providerCredential.id, { onDelete: "set null" }),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    error: text("error"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({})
  },
  (table) => ({
    taskRoleIdx: index("agent_run_task_role_idx").on(table.taskId, table.role)
  })
);

export const toolCall = pgTable(
  "tool_call",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentRunId: uuid("agent_run_id")
      .notNull()
      .references(() => agentRun.id, { onDelete: "cascade" }),
    status: toolCallStatus("status").notNull().default("pending"),
    toolName: text("tool_name").notNull(),
    input: jsonb("input").$type<Record<string, unknown>>().notNull().default({}),
    output: jsonb("output").$type<Record<string, unknown>>(),
    approvalRequired: boolean("approval_required").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    agentRunIdx: index("tool_call_agent_run_idx").on(table.agentRunId)
  })
);

export const mcpServer = pgTable(
  "mcp_server",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").references(() => workspace.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    transport: text("transport").notNull(),
    command: text("command"),
    url: text("url"),
    env: jsonb("env").$type<Record<string, string>>().notNull().default({}),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    workspaceIdx: index("mcp_server_workspace_idx").on(table.workspaceId)
  })
);

export const githubInstallation = pgTable(
  "github_installation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    installationId: text("installation_id").notNull(),
    accountLogin: text("account_login").notNull(),
    permissions: jsonb("permissions").$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    ownerInstallationIdx: uniqueIndex("github_installation_owner_installation_idx").on(table.ownerId, table.installationId)
  })
);

export const apiUsage = pgTable(
  "api_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").references(() => workspace.id, { onDelete: "set null" }),
    providerId: uuid("provider_id").references(() => providerCredential.id, { onDelete: "set null" }),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    latencyMs: integer("latency_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userCreatedIdx: index("api_usage_user_created_idx").on(table.userId, table.createdAt)
  })
);

export const deployment = pgTable(
  "deployment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    target: text("target").notNull(),
    status: taskStatus("status").notNull().default("queued"),
    url: text("url"),
    commitSha: text("commit_sha"),
    logsRef: text("logs_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    workspaceTargetIdx: index("deployment_workspace_target_idx").on(table.workspaceId, table.target)
  })
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    workspaceId: uuid("workspace_id").references(() => workspace.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    target: text("target"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    workspaceCreatedIdx: index("audit_log_workspace_created_idx").on(table.workspaceId, table.createdAt)
  })
);
