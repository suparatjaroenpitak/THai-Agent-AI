import { trace } from "@opentelemetry/api";

export const tracer = trace.getTracer("opencodex");

export async function withSpan<T>(name: string, fn: () => Promise<T>) {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      return await fn();
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
