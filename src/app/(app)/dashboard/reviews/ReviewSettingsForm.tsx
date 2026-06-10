"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

interface ReviewConfig {
  googleReviewUrl?: string;
  yelpReviewUrl?: string;
  autoSend?: boolean;
  autoSendAfterDays?: number;
}

export function ReviewSettingsForm({ initial }: { initial: ReviewConfig | null }) {
  const { toast } = useToast();
  const [googleReviewUrl, setGoogleReviewUrl] = useState(initial?.googleReviewUrl ?? "");
  const [yelpReviewUrl, setYelpReviewUrl] = useState(initial?.yelpReviewUrl ?? "");
  const [autoSend, setAutoSend] = useState(initial?.autoSend ?? false);
  const [autoSendAfterDays, setAutoSendAfterDays] = useState(initial?.autoSendAfterDays ?? 14);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleReviewUrl, yelpReviewUrl, autoSend, autoSendAfterDays }),
      });
      if (!res.ok) {
        toast({ title: "Save failed", description: "Check the URLs and try again.", variant: "error" });
        return;
      }
      toast({ title: "Review settings saved", variant: "success" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Google review link</span>
          <input
            type="url"
            value={googleReviewUrl}
            onChange={(e) => setGoogleReviewUrl(e.target.value)}
            placeholder="https://g.page/r/.../review"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <span className="block text-xs text-muted-foreground">
            Find it in Google Business Profile → &quot;Ask for reviews&quot;.
          </span>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Yelp review link (optional)</span>
          <input
            type="url"
            value={yelpReviewUrl}
            onChange={(e) => setYelpReviewUrl(e.target.value)}
            placeholder="https://www.yelp.com/writeareview/biz/..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoSend}
            onChange={(e) => setAutoSend(e.target.checked)}
            className="h-4 w-4 accent-current"
          />
          <span className="font-medium">Auto-send review requests</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="number"
            min={1}
            max={90}
            value={autoSendAfterDays}
            onChange={(e) => setAutoSendAfterDays(Number(e.target.value))}
            disabled={!autoSend}
            className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent disabled:opacity-50"
          />
          days after a project is won
        </label>
      </div>

      <Button type="submit" disabled={saving} className="h-9 text-sm">
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
