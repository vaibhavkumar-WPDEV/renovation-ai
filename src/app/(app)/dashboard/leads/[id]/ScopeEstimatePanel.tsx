"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

interface Scope {
  id: string;
  vertical: string;
  dimensions: Record<string, number> | null;
  materials: Record<string, string> | null;
  timeline: string | null;
  budgetBand: string | null;
  confidence: number | null;
}

interface Estimate {
  lowCents: number;
  highCents: number;
  currency: string;
  lineItems: Array<{ label: string; quantity: number; unit: string; totalCents: number }>;
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}

export function ScopeEstimatePanel({
  leadId,
  transcript,
  initialScope,
  initialEstimate,
}: {
  leadId: string;
  transcript: string;
  initialScope: Scope | null;
  initialEstimate: Estimate | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [scope, setScope] = useState<Scope | null>(initialScope);
  const [estimate, setEstimate] = useState<Estimate | null>(initialEstimate);
  const [analyzing, setAnalyzing] = useState(false);
  const [estimating, setEstimating] = useState(false);

  async function analyze() {
    if (!transcript || transcript.length < 10) {
      toast({ title: "No conversation yet", description: "This lead has no chat to analyze.", variant: "warning" });
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/scopes/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, transcript }),
      });
      const data = (await res.json()) as { scope?: Scope; error?: string; message?: string };
      if (!res.ok) {
        toast({
          title: data.error === "upgrade_required" ? "Upgrade required" : "Analysis failed",
          description: data.message ?? data.error,
          variant: data.error === "upgrade_required" ? "warning" : "error",
        });
        return;
      }
      setScope(data.scope ?? null);
      setEstimate(null);
      toast({ title: "Scope extracted", variant: "success" });
      router.refresh();
    } finally {
      setAnalyzing(false);
    }
  }

  async function compute() {
    if (!scope) return;
    setEstimating(true);
    try {
      const res = await fetch("/api/estimates/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeId: scope.id }),
      });
      const data = (await res.json()) as { estimate?: Estimate; error?: string; message?: string };
      if (!res.ok) {
        toast({
          title: data.error === "upgrade_required" ? "Upgrade required" : "Estimate failed",
          description: data.message ?? data.error,
          variant: data.error === "upgrade_required" ? "warning" : "error",
        });
        return;
      }
      setEstimate(data.estimate ?? null);
      toast({ title: "Estimate computed", variant: "success" });
    } finally {
      setEstimating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Scope */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Project scope</h3>
          <Button onClick={analyze} disabled={analyzing} variant="outline" className="h-8 text-xs">
            {analyzing ? "Analyzing…" : scope ? "Re-analyze" : "Analyze from chat"}
          </Button>
        </div>
        {scope ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><dt className="text-muted-foreground">Vertical</dt><dd className="capitalize">{scope.vertical.replace(/_/g, " ")}</dd></div>
            <div><dt className="text-muted-foreground">Confidence</dt><dd>{scope.confidence ?? "—"}%</dd></div>
            {scope.timeline && <div><dt className="text-muted-foreground">Timeline</dt><dd>{scope.timeline}</dd></div>}
            {scope.budgetBand && <div><dt className="text-muted-foreground">Budget band</dt><dd>{scope.budgetBand}</dd></div>}
            {scope.dimensions && Object.entries(scope.dimensions).map(([k, v]) => (
              <div key={k}><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>
            ))}
            {scope.materials && Object.entries(scope.materials).map(([k, v]) => (
              <div key={k}><dt className="text-muted-foreground capitalize">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No scope yet. Analyze the conversation to extract project specs.
          </p>
        )}
      </div>

      {/* Estimate */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Budget estimate</h3>
          <Button onClick={compute} disabled={estimating || !scope} variant="outline" className="h-8 text-xs">
            {estimating ? "Computing…" : estimate ? "Recompute" : "Compute estimate"}
          </Button>
        </div>
        {estimate ? (
          <div className="mt-3 space-y-3">
            <p className="text-2xl font-bold">
              {money(estimate.lowCents, estimate.currency)} – {money(estimate.highCents, estimate.currency)}
            </p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {estimate.lineItems.map((li, i) => (
                  <tr key={i}>
                    <td className="py-1.5">{li.label}</td>
                    <td className="py-1.5 text-right text-muted-foreground">
                      {li.quantity} {li.unit}
                    </td>
                    <td className="py-1.5 text-right font-medium">{money(li.totalCents, estimate.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {scope ? "Compute a price range from this scope." : "Analyze a scope first."}
          </p>
        )}
      </div>
    </div>
  );
}
