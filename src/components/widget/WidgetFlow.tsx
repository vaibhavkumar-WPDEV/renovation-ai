"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

const STYLES = [
  {
    id: "modern-shaker",
    name: "Modern Shaker",
    description: "Clean white cabinets, quartz countertops",
    swatch: "#F8FAFC",
    border: "#CBD5E1",
  },
  {
    id: "contemporary-slab",
    name: "Contemporary Slab",
    description: "Flat fronts, bold contrast, statement hardware",
    swatch: "#1E293B",
    border: "#1E293B",
  },
  {
    id: "farmhouse",
    name: "Farmhouse",
    description: "Warm wood tones, apron sink, open shelving",
    swatch: "#D4A96A",
    border: "#B8863A",
  },
  {
    id: "transitional",
    name: "Transitional",
    description: "Timeless blend of classic and contemporary",
    swatch: "#94A3B8",
    border: "#64748B",
  },
  {
    id: "coastal",
    name: "Coastal",
    description: "Light and airy, soft blues, natural textures",
    swatch: "#7DD3FC",
    border: "#38BDF8",
  },
  {
    id: "industrial",
    name: "Industrial",
    description: "Concrete, steel, raw material contrast",
    swatch: "#6B7280",
    border: "#4B5563",
  },
];

type Step = "upload" | "style" | "generating" | "reveal" | "email" | "booked";

interface Props {
  tenantSlug: string;
  tenantName: string;
  accentColor: string;
}

export function WidgetFlow({ tenantSlug, tenantName, accentColor }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [renderId, setRenderId] = useState<string | null>(null);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  const handlePhotoAccepted = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
    setUploading(true);

    try {
      const res = await fetch("/api/widget/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          filename: file.name || "photo.jpg",
          contentType: file.type || "image/jpeg",
          size: file.size,
        }),
      });
      const data = await res.json();

      if (data.uploadUrl) {
        await fetch(data.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "image/jpeg" },
        });
      }

      setPhotoId(data.photoId);
    } catch (err) {
      console.error("[widget] Upload error:", err);
    } finally {
      setUploading(false);
    }

    setStep("style");
  }, [tenantSlug]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => { if (files[0]) handlePhotoAccepted(files[0]); },
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic"] },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
  });

  const handleStartRender = useCallback(async () => {
    if (!photoId || !selectedStyle) return;
    setStep("generating");
    setRenderProgress(0);
    elapsedRef.current = 0;

    try {
      const style = STYLES.find((s) => s.id === selectedStyle);
      const res = await fetch("/api/v1/renders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          photoId,
          primaryChange: `Redesign in ${style?.name ?? "Modern"} style`,
        }),
      });
      const data = await res.json();
      setRenderId(data.id);
    } catch (err) {
      console.error("[widget] Render request error:", err);
      // Fall back to showing original
      setRenderUrl(photoPreview);
      setStep("reveal");
    }
  }, [photoId, selectedStyle, tenantSlug, photoPreview]);

  // Poll render status
  useEffect(() => {
    if (!renderId || step !== "generating") return;

    progressRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setRenderProgress((p) => Math.min(p + 1.5, 92));

      // Timeout after 120 seconds — fall back to original photo
      if (elapsedRef.current >= 120) {
        clearInterval(progressRef.current!);
        clearInterval(pollRef.current!);
        setRenderUrl(photoPreview);
        setStep("reveal");
      }
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/widget/render/${renderId}`);
        const data = await res.json();

        if (data.status === "completed" && data.outputUrl) {
          clearInterval(progressRef.current!);
          clearInterval(pollRef.current!);
          setRenderProgress(100);
          setRenderUrl(data.outputUrl);
          setStep("reveal");
        } else if (data.status === "failed") {
          clearInterval(progressRef.current!);
          clearInterval(pollRef.current!);
          setRenderUrl(photoPreview);
          setStep("reveal");
        }
      } catch {
        // keep polling
      }
    }, 3000);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [renderId, step, photoPreview]);

  const handleEmailSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug, email }),
      });
    } catch (err) {
      console.error("[widget] Lead creation error:", err);
    } finally {
      setSubmitting(false);
    }
    setStep("booked");
  }, [email, tenantSlug]);

  const reset = useCallback(() => {
    setStep("upload");
    setPhotoPreview(null);
    setPhotoId(null);
    setSelectedStyle(null);
    setRenderId(null);
    setRenderUrl(null);
    setRenderProgress(0);
    setEmail("");
  }, []);

  // ── STEP: UPLOAD ────────────────────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div className="space-y-4">
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
            isDragActive
              ? "border-accent bg-accent/5"
              : "border-border hover:border-accent/50 hover:bg-muted/20"
          }`}
        >
          <input {...getInputProps()} />
          <div className="mb-4 text-5xl">📷</div>
          <p className="text-base font-semibold">Drop your kitchen photo here</p>
          <p className="mt-1 text-sm text-muted-foreground">
            JPG, PNG, HEIC up to 20 MB
          </p>
          <div
            className="mt-5 inline-block rounded-lg px-5 py-2.5 text-sm font-medium text-white"
            style={{ backgroundColor: accentColor, color: "#0f172a" }}
          >
            Choose photo
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm hover:bg-muted/40">
          <span>📱</span>
          <span>Take photo with camera</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePhotoAccepted(f);
            }}
          />
        </label>

        <p className="text-center text-xs text-muted-foreground">
          Your photo is never shared. Used only to generate your design.
        </p>
      </div>
    );
  }

  // ── STEP: STYLE PICKER ──────────────────────────────────────────────────────
  if (step === "style") {
    return (
      <div className="space-y-5">
        {photoPreview && (
          <div
            className="relative overflow-hidden rounded-xl"
            style={{ aspectRatio: "16/9" }}
          >
            <img
              src={photoPreview}
              alt="Your space"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <p className="absolute bottom-3 left-3 text-sm font-medium text-white">
              Your space
            </p>
            <button
              onClick={reset}
              className="absolute right-3 top-3 rounded-lg bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/70"
            >
              Change photo
            </button>
          </div>
        )}

        <div>
          <p className="mb-3 font-semibold">Pick a style</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  selectedStyle === style.id
                    ? "ring-1 ring-accent border-accent bg-accent/5"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <div
                  className="mb-2 h-8 w-8 rounded-lg"
                  style={{
                    backgroundColor: style.swatch,
                    border: `1px solid ${style.border}`,
                  }}
                />
                <p className="text-sm font-medium leading-tight">{style.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {style.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleStartRender}
          disabled={!selectedStyle || uploading}
          className="w-full rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-40"
          style={{
            backgroundColor: selectedStyle ? accentColor : undefined,
            color: selectedStyle ? "#0f172a" : undefined,
            background: selectedStyle ? undefined : "var(--muted)",
          }}
        >
          {uploading ? "Uploading…" : "Generate my AI design →"}
        </button>
      </div>
    );
  }

  // ── STEP: GENERATING ────────────────────────────────────────────────────────
  if (step === "generating") {
    const style = STYLES.find((s) => s.id === selectedStyle);
    return (
      <div className="flex flex-col items-center py-10 text-center">
        {photoPreview && (
          <div
            className="relative mb-6 w-full max-w-sm overflow-hidden rounded-2xl"
            style={{ aspectRatio: "4/3" }}
          >
            <img
              src={photoPreview}
              alt="Processing"
              className="h-full w-full object-cover opacity-50"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl bg-black/60 px-6 py-4 text-white">
                <div className="text-3xl font-bold">
                  {Math.round(renderProgress)}%
                </div>
                <div className="mt-1 text-xs opacity-80">Generating…</div>
              </div>
            </div>
            <div
              className="absolute bottom-0 left-0 h-1 bg-accent transition-all duration-1000"
              style={{ width: `${renderProgress}%` }}
            />
          </div>
        )}

        <h3 className="text-lg font-semibold">Creating your AI design</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {style?.name} style · About 45 seconds
        </p>

        <div className="mt-6 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          ✨ {tenantName} has generated 127 designs this week
        </div>
      </div>
    );
  }

  // ── STEP: REVEAL ────────────────────────────────────────────────────────────
  if (step === "reveal") {
    const style = STYLES.find((s) => s.id === selectedStyle);
    return (
      <div className="space-y-5">
        {photoPreview && renderUrl && (
          <BeforeAfterSlider before={photoPreview} after={renderUrl} />
        )}

        <div className="rounded-2xl border border-border bg-muted/40 p-5">
          <h3 className="font-semibold">
            Your {style?.name} design is ready
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email to save the full-res design and get a free quote
            from {tenantName}.
          </p>
          <form onSubmit={handleEmailSubmit} className="mt-4 flex gap-2">
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: accentColor, color: "#0f172a" }}
            >
              {submitting ? "…" : "Save"}
            </button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            No spam. We&apos;ll send your design and a free quote.
          </p>
        </div>

        <button
          onClick={reset}
          className="w-full text-center text-xs text-muted-foreground underline underline-offset-2"
        >
          Try a different style
        </button>
      </div>
    );
  }

  // ── STEP: BOOKED ────────────────────────────────────────────────────────────
  if (step === "booked") {
    return (
      <div className="space-y-6 py-6 text-center">
        <div className="text-5xl">🎉</div>

        <div>
          <h3 className="text-xl font-semibold">Design saved!</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;ve emailed your AI design to{" "}
            <span className="font-medium text-foreground">{email}</span>.{" "}
            {tenantName} will follow up with a free quote within 24 hours.
          </p>
        </div>

        <div className="rounded-2xl border border-border p-5 text-left">
          <p className="text-sm font-medium">Want a faster response?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Book a free 15-minute design call — no commitment.
          </p>
          <button
            className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold"
            style={{ backgroundColor: accentColor, color: "#0f172a" }}
          >
            Book a free consultation →
          </button>
        </div>

        <button
          onClick={reset}
          className="text-sm text-muted-foreground underline underline-offset-2"
        >
          Try another design
        </button>
      </div>
    );
  }

  return null;
}
