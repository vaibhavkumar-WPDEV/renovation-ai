"use client";
import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const VOICE_TONES = [
  { id: "warm-expert", label: "Warm & expert" },
  { id: "professional", label: "Professional" },
  { id: "friendly", label: "Friendly & casual" },
  { id: "premium", label: "Premium & refined" },
];

export default function BrandkitPage() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name") as string,
      license: fd.get("license") as string,
      bio: fd.get("bio") as string,
      primaryColor: fd.get("primaryColorHex") as string,
      accentColor: fd.get("accentColorHex") as string,
      voiceTone: fd.get("voiceTone") as string,
    };

    try {
      const res = await fetch("/api/brandkit/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Save failed");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">BrandKit</h1>
        <p className="text-sm text-muted-foreground">
          Tell the AI how to sound and look like your business. This trains your
          chat assistant and styles your homeowner widget.
        </p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle>Business identity</CardTitle>
            <CardDescription>Shown in the widget header and AI responses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Business name</label>
                <Input placeholder="Haven Cabinetry" name="name" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">License number</label>
                <Input placeholder="LIC-123456" name="license" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">About your business</label>
              <textarea
                name="bio"
                rows={3}
                placeholder="We're a family-run cabinetry studio specialising in custom kitchens for Sydney homeowners. 15 years experience, 400+ projects completed."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
              <p className="text-xs text-muted-foreground">Used as the AI assistant&apos;s background knowledge.</p>
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Brand colors</CardTitle>
            <CardDescription>Applied to your homeowner widget.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Primary color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="primaryColor"
                    defaultValue="#0F172A"
                    className="h-10 w-10 cursor-pointer rounded border border-border"
                    onChange={(e) => {
                      const hex = formRef.current?.querySelector<HTMLInputElement>(
                        '[name="primaryColorHex"]',
                      );
                      if (hex) hex.value = e.target.value;
                    }}
                  />
                  <Input placeholder="#0F172A" name="primaryColorHex" defaultValue="#0F172A" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Accent color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="accentColor"
                    defaultValue="#F59E0B"
                    className="h-10 w-10 cursor-pointer rounded border border-border"
                    onChange={(e) => {
                      const hex = formRef.current?.querySelector<HTMLInputElement>(
                        '[name="accentColorHex"]',
                      );
                      if (hex) hex.value = e.target.value;
                    }}
                  />
                  <Input placeholder="#F59E0B" name="accentColorHex" defaultValue="#F59E0B" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voice tone */}
        <Card>
          <CardHeader>
            <CardTitle>AI voice tone</CardTitle>
            <CardDescription>How your chat assistant speaks to homeowners.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {VOICE_TONES.map((tone) => (
                <label
                  key={tone.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted/40 has-[:checked]:border-accent has-[:checked]:bg-accent/5"
                >
                  <input
                    type="radio"
                    name="voiceTone"
                    value={tone.id}
                    defaultChecked={tone.id === "warm-expert"}
                    className="accent-amber-500"
                  />
                  {tone.label}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>Shown in the widget header. PNG or SVG recommended.</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-sm hover:bg-muted/30">
              <span className="text-2xl">🖼️</span>
              <span>Click to upload logo</span>
              <input type="file" accept="image/*" className="hidden" name="logo" />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              Logo upload to R2 storage coming in the next update.
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving} variant="default">
            {saving ? "Saving…" : "Save BrandKit"}
          </Button>
          {saved && <span className="text-sm text-green-600">✓ Saved successfully</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
    </div>
  );
}
