import Redis from "ioredis";
import { runOpenCodexWorkflow } from "../src/ai/langgraph";
import { env } from "../src/env";

const subscriber = new Redis(env.REDIS_URL);
const publisher = new Redis(env.REDIS_URL);

type WorkerEvent = {
  type: string;
  workspaceId?: string;
  prompt?: string;
  task?: {
    id: string;
    workspaceId: string;
    title: string;
    objective: string;
  };
};

async function publish(type: string, payload: Record<string, unknown>) {
  await publisher.publish(
    "opencodex:events",
    JSON.stringify({
      type,
      ...payload,
      emittedAt: new Date().toISOString()
    })
  );
}

subscriber.on("message", async (_channel, raw) => {
  const event = JSON.parse(raw) as WorkerEvent;

  if (event.type === "agent.workflow.queued" && event.workspaceId && event.prompt) {
    await publish("agent.workflow.started", {
      workspaceId: event.workspaceId
    });
    const result = await runOpenCodexWorkflow({
      workspaceId: event.workspaceId,
      prompt: event.prompt,
      mode: "auto"
    });
    await publish("agent.workflow.completed", {
      workspaceId: event.workspaceId,
      steps: result.steps,
      summary: result.summary
    });
  }

  if (event.type === "task.created" && event.task) {
    await publish("task.running", {
      taskId: event.task.id,
      workspaceId: event.task.workspaceId
    });
  }
});

await subscriber.subscribe("opencodex:tasks");
console.log("OpenCodex worker subscribed to opencodex:tasks");
