"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const VERTICALS = [
  { id: "cabinetry", label: "Cabinetry", icon: "🪵", desc: "Custom cabinets & built-ins" },
  { id: "kitchen", label: "Kitchen", icon: "🍳", desc: "Full kitchen renovations" },
  { id: "bathroom", label: "Bathroom", icon: "🛁", desc: "Bathroom remodeling" },
  { id: "landscaping", label: "Landscaping", icon: "🌿", desc: "Outdoor landscaping" },
  { id: "pool", label: "Pool", icon: "🏊", desc: "Pool design & installation" },
  { id: "outdoor_structures", label: "Outdoor Structures", icon: "🏡", desc: "Decks, pergolas, patios" },
  { id: "full_renovation", label: "Full Renovation", icon: "🏗️", desc: "Whole-home renovations" },
] as const;

const COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "AU", label: "Australia" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "NZ", label: "New Zealand" },
];

type VerticalId = typeof VERTICALS[number]["id"];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [vertical, setVertical] = useState<VerticalId | null>(null);
  const [countryCode, setCountryCode] = useState("US");

  // Derive slug from business name in the onChange handler (avoids setState-in-effect lint rule)
  function handleBusinessNameChange(value: string) {
    setBusinessName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  }

  async function handleFinish() {
    if (!vertical) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, slug, primaryVertical: vertical, countryCode }),
      });
      const data = await res.json() as { error?: string; tenantSlug?: string };
      if (!res.ok) {
        if (res.status === 409 && data.tenantSlug) {
          // Already provisioned — go to dashboard
          router.push("/dashboard");
          return;
        }
        throw new Error(data.error ?? "Setup failed");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      {/* Progress */}
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                step >= n
                  ? "bg-accent text-background"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > n ? "✓" : n}
            </div>
            {n < 3 && (
              <div className={`h-px w-8 ${step > n ? "bg-accent" : "bg-border"}`} />
            )}
          </div>
        ))}
        <span className="ml-3 text-sm text-muted-foreground">
          {step === 1 && "Business identity"}
          {step === 2 && "Your specialty"}
          {step === 3 && "Location"}
        </span>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">Welcome to RenovateAI 👋</h1>
      <p className="mt-2 text-muted-foreground">
        Set up your AI sales engine in under 3 minutes.
      </p>

      {/* STEP 1 — Business name + slug */}
      {step === 1 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>What&apos;s your business name?</CardTitle>
            <CardDescription>
              This appears in your homeowner widget and AI assistant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Business name</label>
              <Input
                placeholder="Haven Cabinetry"
                value={businessName}
                onChange={(e) => handleBusinessNameChange(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Your widget URL</label>
              <div className="flex items-center rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">renovateai.com/embed/</span>
                <input
                  className="flex-1 bg-transparent font-mono outline-none"
                  value={slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, hyphens only. Cannot be changed later.
              </p>
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={businessName.length < 2 || slug.length < 2}
              className="w-full"
            >
              Continue →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 — Vertical */}
      {step === 2 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>What&apos;s your primary specialty?</CardTitle>
            <CardDescription>
              This trains your AI assistant and tunes the render pipeline for your work.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {VERTICALS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVertical(v.id)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    vertical === v.id
                      ? "border-accent bg-accent/5 ring-1 ring-accent"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <div className="mb-1.5 text-2xl">{v.icon}</div>
                  <p className="text-sm font-medium">{v.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{v.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                ← Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!vertical}
                className="flex-1"
              >
                Continue →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3 — Country + finish */}
      {step === 3 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Where are you based?</CardTitle>
            <CardDescription>
              Used for local pricing benchmarks and your AI assistant&apos;s regional knowledge.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setCountryCode(c.code)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    countryCode === c.code
                      ? "border-accent bg-accent/5 ring-1 ring-accent"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm space-y-1.5">
              <p className="font-medium">Ready to launch:</p>
              <p className="text-muted-foreground">🏢 {businessName}</p>
              <p className="text-muted-foreground">🔗 renovateai.com/embed/{slug}</p>
              <p className="text-muted-foreground">
                🎯 {VERTICALS.find((v) => v.id === vertical)?.label} ·{" "}
                {COUNTRIES.find((c) => c.code === countryCode)?.label}
              </p>
              <p className="text-xs text-green-600 font-medium pt-1">
                ✓ 14-day free trial — no credit card required
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} disabled={submitting} className="flex-1">
                ← Back
              </Button>
              <Button onClick={handleFinish} disabled={submitting} className="flex-1">
                {submitting ? "Setting up…" : "Launch my AI engine →"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
