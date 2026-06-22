import { Activity, BarChart3, Cpu, Database, Server, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const adminStats = [
  { label: "Users", value: "1", icon: Users },
  { label: "Workers", value: "3", icon: Cpu },
  { label: "Providers", value: "17", icon: Server },
  { label: "Usage", value: "$0.00", icon: BarChart3 },
  { label: "Logs", value: "0 errors", icon: Activity },
  { label: "Database", value: "ready", icon: Database }
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#121212] p-6 text-zinc-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">OpenCodex Admin</h1>
            <p className="mt-1 text-sm text-zinc-500">Users, API usage, billing, logs, providers, workers, queue, and analytics.</p>
          </div>
          <Badge variant="success">Online</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {adminStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <section key={stat.label} className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{stat.label}</span>
                  <Icon className="size-4 text-emerald-300" />
                </div>
                <div className="mt-3 text-2xl font-semibold">{stat.value}</div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
