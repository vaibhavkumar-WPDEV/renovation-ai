"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export function ApiKeysPanel() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setRevealedKey(data.key);
        setName("");
        await load();
      } else {
        toast({ title: "Couldn't create key", variant: "error" });
      }
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    const res = await fetch("/api/settings/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast({ title: "Key revoked", variant: "success" });
      await load();
    } else {
      toast({ title: "Couldn't revoke key", variant: "error" });
    }
  }

  return (
    <div className="space-y-4">
      {revealedKey && (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="font-medium text-amber-800 dark:text-amber-400">
            Copy this key now — it won&apos;t be shown again.
          </p>
          <code className="block break-all rounded-lg bg-muted px-3 py-2 text-xs">{revealedKey}</code>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(revealedKey);
              toast({ title: "Copied", variant: "success" });
            }}
          >
            Copy
          </Button>
        </div>
      )}

      <form onSubmit={createKey} className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Key name</label>
          <Input
            placeholder="e.g. Zapier integration"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={creating || !name.trim()}>
          {creating ? "Creating…" : "Create key"}
        </Button>
      </form>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">No API keys yet.</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{k.name}</p>
                <p className="text-xs text-muted-foreground">
                  <code>{k.keyPrefix}…</code> · created {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · never used"}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => revoke(k.id)}>
                Revoke
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
