"use client";
import { useState } from "react";

export function StripePortalButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const { url } = await res.json() as { url?: string };
      if (url) window.location.href = url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
    >
      {loading ? "Loading…" : "Manage billing →"}
    </button>
  );
}
