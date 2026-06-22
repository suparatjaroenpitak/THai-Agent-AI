import Redis from "ioredis";
import { env } from "../src/env";

const sockets = new Set<ServerWebSocket<{ workspaceId?: string }>>();
const subscriber = new Redis(env.REDIS_URL);

subscriber.on("message", (_channel, raw) => {
  for (const socket of sockets) {
    socket.send(raw);
  }
});

await subscriber.subscribe("opencodex:events", "opencodex:terminal");

Bun.serve<{ workspaceId?: string }>({
  port: env.WEBSOCKET_PORT,
  fetch(request, server) {
    const url = new URL(request.url);
    const upgraded = server.upgrade(request, {
      data: {
        workspaceId: url.searchParams.get("workspaceId") ?? undefined
      }
    });

    if (upgraded) return undefined;
    return new Response("OpenCodex WebSocket server", { status: 200 });
  },
  websocket: {
    open(socket) {
      sockets.add(socket);
      socket.send(
        JSON.stringify({
          type: "socket.connected",
          workspaceId: socket.data.workspaceId,
          emittedAt: new Date().toISOString()
        })
      );
    },
    message(socket, message) {
      socket.send(
        JSON.stringify({
          type: "socket.echo",
          message: String(message),
          emittedAt: new Date().toISOString()
        })
      );
    },
    close(socket) {
      sockets.delete(socket);
    }
  }
});

console.log(`OpenCodex WebSocket server listening on ${env.WEBSOCKET_PORT}`);
