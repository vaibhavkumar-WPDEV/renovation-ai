"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";

export function DisconnectButton({ provider }: { provider: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function disconnect() {
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/${provider}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Disconnected", variant: "success" });
        router.refresh();
      } else {
        toast({ title: "Couldn't disconnect", variant: "error" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={disconnect}
      disabled={loading}
      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
    >
      {loading ? "…" : "Disconnect"}
    </button>
  );
}
