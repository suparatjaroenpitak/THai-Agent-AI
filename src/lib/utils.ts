import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTokenCost(costUsd: number) {
  if (costUsd < 0.001) return "<$0.001";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4
  }).format(costUsd);
}

export function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id;
}
