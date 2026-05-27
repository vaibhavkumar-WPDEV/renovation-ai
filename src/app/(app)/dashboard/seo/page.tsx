"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

interface SeoPageRow {
  id: string;
  service: string;
  city: string;
  slug: string;
  views: number;
  leadsCaptured: number;
  publishedAt: string | null;
}

export default function SeoPage() {
  const { toast } = useToast();
  const [pages, setPages] = useState<SeoPageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [service, setService] = useState("");
  const [citiesText, setCitiesText] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/seo");
      const data = (await res.json()) as { pages?: SeoPageRow[]; tenantSlug?: string };
      setPages(data.pages ?? []);
      if (data.tenantSlug) setTenantSlug(data.tenantSlug);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const cities = citiesText
      .split(/[\n,]/)
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 10);
    if (!service || cities.length === 0) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/seo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, cities }),
      });
      const data = (await res.json()) as { error?: string; message?: string; count?: number };
      if (!res.ok) {
        toast({
          title: data.error === "upgrade_required" ? "Upgrade required" : "Generation failed",
          description: data.message ?? data.error ?? "Try again",
          variant: data.error === "upgrade_required" ? "warning" : "error",
        });
        return;
      }
      toast({
        title: "Pages generated",
        description: `Created ${data.count} SEO page${data.count === 1 ? "" : "s"}.`,
        variant: "success",
      });
      setCitiesText("");
      await load();
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(slug: string) {
    const res = await fetch(`/api/seo?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Page deleted", variant: "success" });
      await load();
    }
  }

  const totalViews = pages.reduce((sum, p) => sum + p.views, 0);
  const totalLeads = pages.reduce((sum, p) => sum + p.leadsCaptured, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SEO Pages</h1>
        <p className="text-sm text-muted-foreground">
          Auto-generate local service landing pages that rank on Google and capture leads with your
          embedded widget. <span className="font-medium">Pro plan and above.</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-2xl font-bold">{pages.length}</p>
            <p className="text-xs text-muted-foreground">Pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-2xl font-bold">{totalViews}</p>
            <p className="text-xs text-muted-foreground">Total views</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-2xl font-bold">{totalLeads}</p>
            <p className="text-xs text-muted-foreground">Leads captured</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate pages</CardTitle>
          <CardDescription>
            One service across multiple cities. Each city becomes its own optimized page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Service</label>
              <Input
                placeholder="Kitchen Remodeling"
                value={service}
                onChange={(e) => setService(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cities (one per line or comma-separated)</label>
              <textarea
                rows={4}
                placeholder={"Austin\nRound Rock\nCedar Park"}
                value={citiesText}
                onChange={(e) => setCitiesText(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
              />
              <p className="text-xs text-muted-foreground">Up to 10 cities per batch.</p>
            </div>
            <Button type="submit" disabled={generating || !service}>
              {generating ? "Generating… (this can take a minute)" : "Generate SEO pages"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Published pages</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pages yet. Generate your first batch above.</p>
          ) : (
            <div className="space-y-2">
              {pages.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {p.service} — {p.city}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">/s/{tenantSlug || "{slug}"}/{p.slug}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
                    <span>{p.views} views</span>
                    <span>{p.leadsCaptured} leads</span>
                    <a
                      href={`/s/${tenantSlug}/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      Preview
                    </a>
                    <button onClick={() => handleDelete(p.slug)} className="text-red-500 hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
