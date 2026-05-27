/**
 * Deterministic budget estimator.
 *
 * Computes a defensible price range from a structured scope + the contractor's
 * pricing rules. No LLM here — pricing must be reproducible and auditable.
 * Sensible 2026 US defaults are used when a contractor hasn't set their rates.
 */
import type { ProjectScope } from "@/db/schema";

export interface PricingRules {
  cabinetPerLinearFt?: number;
  countertopPerSqFt?: number;
  laborMultiplier?: number;
  minProjectValue?: number;
}

// 2026 US baseline rates (dollars). Contractors override these in settings.
const DEFAULT_RULES: Required<PricingRules> = {
  cabinetPerLinearFt: 350,
  countertopPerSqFt: 75,
  laborMultiplier: 0.6,
  minProjectValue: 8000,
};

export interface LineItem {
  label: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  totalCents: number;
}

export interface EstimateResult {
  lineItems: LineItem[];
  lowCents: number;
  highCents: number;
  currency: string;
}

function dollarsToCents(d: number): number {
  return Math.round(d * 100);
}

export function computeEstimate(
  scope: Pick<ProjectScope, "dimensions" | "materials" | "vertical">,
  rules: PricingRules | null,
  currency = "USD",
): EstimateResult {
  const r = { ...DEFAULT_RULES, ...(rules ?? {}) };
  const dims = scope.dimensions ?? {};
  const lineItems: LineItem[] = [];

  // Cabinetry — by linear feet (fall back to deriving from room width if absent)
  const linearFt = dims.linearFt ?? (dims.widthFt ? dims.widthFt * 1.5 : 0);
  if (linearFt > 0) {
    const total = linearFt * r.cabinetPerLinearFt;
    lineItems.push({
      label: "Cabinetry",
      quantity: Math.round(linearFt),
      unit: "linear ft",
      unitPriceCents: dollarsToCents(r.cabinetPerLinearFt),
      totalCents: dollarsToCents(total),
    });
  }

  // Countertop — by square feet (derive from room area if absent)
  const counterSqFt =
    dims.sqFt ??
    (dims.widthFt && dims.lengthFt ? Math.round(dims.widthFt * dims.lengthFt * 0.3) : 0);
  if (counterSqFt > 0) {
    const total = counterSqFt * r.countertopPerSqFt;
    lineItems.push({
      label: "Countertops",
      quantity: counterSqFt,
      unit: "sq ft",
      unitPriceCents: dollarsToCents(r.countertopPerSqFt),
      totalCents: dollarsToCents(total),
    });
  }

  const materialsCents = lineItems.reduce((sum, li) => sum + li.totalCents, 0);

  // Labor as a multiplier of materials
  if (materialsCents > 0) {
    const laborCents = Math.round(materialsCents * r.laborMultiplier);
    lineItems.push({
      label: "Labor & installation",
      quantity: 1,
      unit: "project",
      unitPriceCents: laborCents,
      totalCents: laborCents,
    });
  }

  let subtotal = lineItems.reduce((sum, li) => sum + li.totalCents, 0);

  // Enforce the contractor's minimum project value
  const minCents = dollarsToCents(r.minProjectValue);
  if (subtotal < minCents) subtotal = minCents;

  // ±15% range to reflect estimate uncertainty
  return {
    lineItems,
    lowCents: Math.round(subtotal * 0.85),
    highCents: Math.round(subtotal * 1.15),
    currency,
  };
}
