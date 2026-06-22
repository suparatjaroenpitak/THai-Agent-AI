export type SandboxSpec = {
  id: string;
  workspaceId: string;
  image: string;
  cpu: number;
  memoryMb: number;
  storageGb: number;
  persistentVolume: string;
  command: string[];
};

export function createDefaultSandboxSpec(workspaceId: string): SandboxSpec {
  return {
    id: `sandbox-${workspaceId}`,
    workspaceId,
    image: "oven/bun:1.2",
    cpu: 2,
    memoryMb: 4096,
    storageGb: 20,
    persistentVolume: `opencodex-${workspaceId}`,
    command: ["bun", "run", "dev"]
  };
}
