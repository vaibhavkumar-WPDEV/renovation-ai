"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function ProposalActions({
  token,
  status,
  signerName,
  signedAt,
  depositCents,
  currency,
  accentColor,
  expired,
  tenantName,
  justPaid,
}: {
  token: string;
  status: string;
  signerName: string | null;
  signedAt: string | null;
  depositCents: number | null;
  currency: string;
  accentColor: string;
  expired: boolean;
  tenantName: string;
  justPaid: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSigned = status === "signed" || status === "deposit_paid" || !!signedAt;
  const isPaid = status === "deposit_paid" || justPaid;
  const depositDue = !!depositCents && depositCents > 0;

  async function sign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/public/proposals/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function payDeposit() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/public/proposals/${token}/deposit`, {
        method: "POST",
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start the payment. Please try again.");
        return;
      }
      window.location.href = data.url;
    } finally {
      setBusy(false);
    }
  }

  if (expired) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 print:hidden">
      {isPaid ? (
        <div className="text-center">
          <p className="text-2xl">🎉</p>
          <h2 className="mt-2 text-lg font-semibold">You&apos;re all set!</h2>
          <p className="mt-1 text-sm text-slate-600">
            Your deposit has been received and your project slot is secured. {tenantName} will be
            in touch shortly to schedule your kickoff.
          </p>
        </div>
      ) : isSigned ? (
        <div className="space-y-4 text-center">
          <h2 className="text-lg font-semibold">
            Signed{signerName ? ` by ${signerName}` : ""} ✓
          </h2>
          {depositDue ? (
            <>
              <p className="text-sm text-slate-600">
                Pay your {money(depositCents!, currency)} deposit to lock in your project slot.
              </p>
              <button
                onClick={payDeposit}
                disabled={busy}
                className="rounded-xl px-8 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: accentColor }}
              >
                {busy ? "Redirecting…" : `Pay ${money(depositCents!, currency)} deposit →`}
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-600">
              {tenantName} will be in touch shortly to schedule your kickoff.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={sign} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Accept this proposal</h2>
            <p className="mt-1 text-sm text-slate-600">
              Type your full name below to sign electronically. Final pricing is confirmed after
              an on-site measurement.
            </p>
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full legal name"
            required
            minLength={2}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            disabled={busy || name.trim().length < 2}
            className="w-full rounded-xl px-8 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
            style={{ backgroundColor: accentColor }}
          >
            {busy ? "Signing…" : "Sign & accept proposal"}
          </button>
        </form>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
