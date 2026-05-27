"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

interface Rules {
  cabinetPerLinearFt?: number;
  countertopPerSqFt?: number;
  laborMultiplier?: number;
  minProjectValue?: number;
}

export function PricingRulesForm({ initial }: { initial: Rules | null }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<Rules>(initial ?? {});

  function set(key: keyof Rules, value: string) {
    setRules((r) => ({ ...r, [key]: value === "" ? undefined : Number(value) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rules),
      });
      if (res.ok) {
        toast({ title: "Pricing saved", variant: "success" });
      } else {
        toast({ title: "Couldn't save", variant: "error" });
      }
    } finally {
      setSaving(false);
    }
  }

  const fields: Array<{ key: keyof Rules; label: string; hint: string }> = [
    { key: "cabinetPerLinearFt", label: "Cabinetry ($ / linear ft)", hint: "e.g. 350" },
    { key: "countertopPerSqFt", label: "Countertop ($ / sq ft)", hint: "e.g. 75" },
    { key: "laborMultiplier", label: "Labor multiplier", hint: "e.g. 0.6 = 60% of materials" },
    { key: "minProjectValue", label: "Minimum project ($)", hint: "e.g. 8000" },
  ];

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
            <Input
              type="number"
              step="any"
              placeholder={f.hint}
              value={rules[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </div>
        ))}
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save pricing rules"}
      </Button>
    </form>
  );
}
