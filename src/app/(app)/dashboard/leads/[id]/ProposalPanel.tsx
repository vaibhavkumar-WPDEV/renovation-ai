"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

interface ProposalRow {
  id: string;
  status: string;
  webUrl: string | null;
  depositCents: number | null;
  signerName: string | null;
  expiresAt: string | null;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600" },
  sent: { label: "Sent", cls: "bg-sky-100 text-sky-700" },
  viewed: { label: "Viewed", cls: "bg-amber-100 text-amber-700" },
  signed: { label: "Signed", cls: "bg-violet-100 text-violet-700" },
  deposit_paid: { label: "Deposit paid", cls: "bg-green-100 text-green-700" },
  expired: { label: "Expired", cls: "bg-red-100 text-red-700" },
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function ProposalPanel({
  scopeId,
  hasEstimate,
  initialProposal,
}: {
  scopeId: string | null;
  hasEstimate: boolean;
  initialProposal: ProposalRow | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [proposal, setProposal] = useState<ProposalRow | null>(initialProposal);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  async function generate() {
    if (!scopeId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/proposals/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeId }),
      });
      const data = (await res.json()) as { proposal?: ProposalRow; error?: string; message?: string };
      if (!res.ok) {
        toast({
          title: data.error === "upgrade_required" ? "Upgrade required" : "Generation failed",
          description: data.message ?? data.error,
          variant: data.error === "upgrade_required" ? "warning" : "error",
        });
        return;
      }
      setProposal(data.proposal ?? null);
      toast({ title: "Proposal drafted", description: "Review it, then send it to the lead.", variant: "success" });
      router.refresh();
    } finally {
      setGenerating(false);
    }
  }

  async function send() {
    if (!proposal) return;
    setSending(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/send`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; sentTo?: string; error?: string; message?: string };
      if (!res.ok) {
        toast({ title: "Send failed", description: data.message ?? data.error, variant: "error" });
        return;
      }
      setProposal({ ...proposal, status: proposal.status === "draft" ? "sent" : proposal.status });
      toast({ title: "Proposal sent", description: `Emailed to ${data.sentTo}`, variant: "success" });
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  function copyLink() {
    if (!proposal?.webUrl) return;
    navigator.clipboard.writeText(proposal.webUrl);
    toast({ title: "Link copied", variant: "success" });
  }

  const badge = proposal ? STATUS_LABEL[proposal.status] ?? STATUS_LABEL.draft : null;
  const canSend = proposal && ["draft", "sent", "viewed"].includes(proposal.status);

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Proposal</h3>
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
              {badge.label}
            </span>
          )}
        </div>
        <Button
          onClick={generate}
          disabled={generating || !scopeId || !hasEstimate}
          variant="outline"
          className="h-8 text-xs"
        >
          {generating ? "Generating…" : proposal ? "Regenerate" : "Generate proposal"}
        </Button>
      </div>

      {proposal ? (
        <div className="mt-3 space-y-3">
          {proposal.signerName && (
            <p className="text-sm">
              Signed by <span className="font-medium">{proposal.signerName}</span>
            </p>
          )}
          {!!proposal.depositCents && (
            <p className="text-sm text-muted-foreground">
              Deposit: <span className="font-medium text-foreground">{money(proposal.depositCents)}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {canSend && (
              <Button onClick={send} disabled={sending} className="h-8 text-xs">
                {sending ? "Sending…" : proposal.status === "draft" ? "Send to lead" : "Resend"}
              </Button>
            )}
            {proposal.webUrl && (
              <>
                <Button onClick={copyLink} variant="outline" className="h-8 text-xs">
                  Copy link
                </Button>
                <a
                  href={proposal.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted"
                >
                  Preview →
                </a>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {!scopeId
            ? "Analyze a scope first."
            : !hasEstimate
              ? "Compute an estimate first — proposals are built on it."
              : "Generate a branded, signable proposal with a deposit link."}
        </p>
      )}
    </div>
  );
}
