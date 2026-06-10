"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

export function ReviewRequestButton({ leadId }: { leadId: string }) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  async function request() {
    setSending(true);
    try {
      const res = await fetch("/api/reviews/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast({
          title: data.error === "upgrade_required" ? "Upgrade required" : "Request failed",
          description: data.message ?? data.error,
          variant: data.error === "upgrade_required" ? "warning" : "error",
        });
        return;
      }
      toast({ title: "Review request sent", variant: "success" });
    } finally {
      setSending(false);
    }
  }

  return (
    <Button onClick={request} disabled={sending} variant="outline" className="h-8 text-xs">
      {sending ? "Sending…" : "Request review"}
    </Button>
  );
}
