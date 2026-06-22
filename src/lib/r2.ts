import { env } from "@/env";

export type R2ObjectRef = {
  bucket: string;
  key: string;
  publicUrl?: string;
};

export function createR2ObjectRef(key: string): R2ObjectRef {
  const cleanKey = key.replace(/^\/+/, "");
  return {
    bucket: env.R2_BUCKET,
    key: cleanKey,
    publicUrl: env.R2_PUBLIC_URL ? `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${cleanKey}` : undefined
  };
}
