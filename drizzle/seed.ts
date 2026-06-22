import { db } from "../src/db";
import { providerCredential, user, workspace } from "../src/db/schema";

const demoUserId = "demo-user";

await db
  .insert(user)
  .values({
    id: demoUserId,
    name: "OpenCodex Admin",
    email: "admin@opencodex.local",
    emailVerified: true,
    role: "admin"
  })
  .onConflictDoNothing();

await db
  .insert(workspace)
  .values({
    ownerId: demoUserId,
    kind: "cloud",
    name: "OpenCodex Demo",
    slug: "opencodex-demo",
    defaultBranch: "main",
    containerImage: "oven/bun:1.2",
    storagePrefix: "workspaces/opencodex-demo"
  })
  .onConflictDoNothing();

await db
  .insert(providerCredential)
  .values({
    userId: demoUserId,
    kind: "openrouter",
    displayName: "OpenRouter Auto",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEncrypted: "replace-with-encrypted-key",
    inputCostPerMillion: "0.200000",
    outputCostPerMillion: "0.800000"
  })
  .onConflictDoNothing();

console.log("Seeded OpenCodex demo data");
