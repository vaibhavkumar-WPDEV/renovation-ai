"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

interface Entry {
  id: string;
  source: string;
  sourceId: string | null;
  content: string;
  metadata: { title?: string } | null;
  createdAt: string;
}

const SOURCES = [
  { id: "faq", label: "FAQ" },
  { id: "services", label: "Services" },
  { id: "pricing", label: "Pricing" },
  { id: "project", label: "Past project" },
  { id: "general", label: "General" },
];

export default function KnowledgePage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState("faq");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge");
      const data = (await res.json()) as { entries?: Entry[] };
      setEntries(data.entries ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Fetch existing knowledge on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, title: title || undefined, text }),
      });
      const data = (await res.json()) as { error?: string; chunks?: number };
      if (!res.ok) {
        toast({ title: "Couldn't add", description: data.error ?? "Try again", variant: "error" });
        return;
      }
      toast({
        title: "Added to AI memory",
        description: `Stored ${data.chunks} chunk${data.chunks === 1 ? "" : "s"}.`,
        variant: "success",
      });
      setTitle("");
      setText("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sourceId: string | null) {
    if (!sourceId) return;
    const res = await fetch(`/api/knowledge?sourceId=${encodeURIComponent(sourceId)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast({ title: "Removed", variant: "success" });
      await load();
    }
  }

  // Group chunks by sourceId so multi-chunk entries show as one item
  const grouped = entries.reduce<Record<string, Entry[]>>((acc, e) => {
    const key = e.sourceId ?? e.id;
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Knowledge Base</h1>
        <p className="text-sm text-muted-foreground">
          Teach your AI consultant about your business. It uses this to answer homeowner questions
          accurately — your FAQs, services, pricing ranges, and past projects.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add knowledge</CardTitle>
          <CardDescription>
            Paste a Q&amp;A, a service description, or details about a past project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSource(s.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    source === s.id
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <Input
              placeholder="Title (optional) — e.g. 'Do you offer financing?'"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              required
              minLength={10}
              maxLength={20000}
              rows={5}
              placeholder="Enter the content your AI should know…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
            />
            <Button type="submit" disabled={saving || text.length < 10}>
              {saving ? "Adding…" : "Add to AI memory"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stored knowledge</CardTitle>
          <CardDescription>{Object.keys(grouped).length} entries</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No knowledge yet. Add your first FAQ above to make your AI smarter.
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([key, chunks]) => {
                const first = chunks[0];
                const titleText = first.metadata?.title ?? first.sourceId ?? "Untitled";
                return (
                  <div
                    key={key}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                          {first.source}
                        </span>
                        <p className="truncate text-sm font-medium">{titleText}</p>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {chunks.map((c) => c.content).join(" ")}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(first.sourceId)}
                      className="shrink-0 text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
