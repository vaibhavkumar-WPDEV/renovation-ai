"use client";
import { useState } from "react";

type Phase = "rate" | "feedback" | "share" | "done";

export function ReviewForm({
  token,
  tenantName,
  leadName,
  accentColor,
  alreadyRated,
}: {
  token: string;
  tenantName: string;
  leadName: string | null;
  accentColor: string;
  alreadyRated: number | null;
}) {
  const [rating, setRating] = useState(alreadyRated ?? 0);
  const [hover, setHover] = useState(0);
  const [phase, setPhase] = useState<Phase>(alreadyRated ? "done" : "rate");
  const [feedback, setFeedback] = useState("");
  const [links, setLinks] = useState<{ google: string | null; yelp: string | null }>({
    google: null,
    yelp: null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(selectedRating: number, withFeedback?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/reviews/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: selectedRating,
          feedback: withFeedback || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        public?: boolean;
        googleReviewUrl?: string | null;
        yelpReviewUrl?: string | null;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return false;
      }
      if (data.public) {
        setLinks({ google: data.googleReviewUrl ?? null, yelp: data.yelpReviewUrl ?? null });
      }
      return data.public ?? false;
    } finally {
      setBusy(false);
    }
  }

  async function pickRating(value: number) {
    setRating(value);
    if (value >= 4) {
      const isPublic = await submit(value);
      setPhase(isPublic ? "share" : "done");
    } else {
      // Low rating: record it, then invite private feedback
      await submit(value);
      setPhase("feedback");
    }
  }

  async function sendFeedback(e: React.FormEvent) {
    e.preventDefault();
    await submit(rating, feedback);
    setPhase("done");
  }

  const greeting = leadName ? `${leadName.split(" ")[0]}, how` : "How";

  if (phase === "share") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-3xl">🙏</p>
        <h1 className="text-lg font-semibold">Thank you so much!</h1>
        <p className="text-sm text-slate-600">
          Would you take 30 seconds to share your experience publicly? It helps neighbors find us
          and means everything to a local business.
        </p>
        {links.google && (
          <a
            href={links.google}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-xl px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            Review us on Google →
          </a>
        )}
        {links.yelp && (
          <a
            href={links.yelp}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold transition hover:bg-slate-50"
          >
            Review us on Yelp →
          </a>
        )}
        {!links.google && !links.yelp && (
          <p className="text-sm text-slate-500">Your rating has been recorded. Thank you!</p>
        )}
      </div>
    );
  }

  if (phase === "feedback") {
    return (
      <form onSubmit={sendFeedback} className="space-y-4">
        <h1 className="text-lg font-semibold">We&apos;re sorry we missed the mark.</h1>
        <p className="text-sm text-slate-600">
          Your feedback goes directly to the owner of {tenantName} — please tell us what went
          wrong so we can make it right.
        </p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={5}
          required
          minLength={5}
          placeholder="What could we have done better?"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
        />
        <button
          type="submit"
          disabled={busy || feedback.trim().length < 5}
          className="w-full rounded-xl px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {busy ? "Sending…" : "Send to the owner"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    );
  }

  if (phase === "done") {
    return (
      <div className="space-y-3 text-center">
        <p className="text-3xl">💛</p>
        <h1 className="text-lg font-semibold">Thank you!</h1>
        <p className="text-sm text-slate-600">
          {rating >= 4
            ? "Your rating has been recorded."
            : `The owner of ${tenantName} has been notified and will reach out personally.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold">{greeting} was your experience with {tenantName}?</h1>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={busy}
            onClick={() => pickRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            className="text-4xl transition-transform hover:scale-110 disabled:opacity-50"
          >
            <span style={{ filter: (hover || rating) >= star ? "none" : "grayscale(1) opacity(0.35)" }}>
              ⭐
            </span>
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-slate-400">Tap a star to rate — takes 10 seconds</p>
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}
