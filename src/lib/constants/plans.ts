/**
 * Per-tier usage limits and feature gates.
 * Source of truth for plan enforcement — mirrors the pricing page copy.
 */

export type PlanName = "starter" | "growth" | "pro" | "agency" | "enterprise";

export interface PlanLimits {
  rendersPerMonth: number;
  leadsPerMonth: number;
  crmIntegrations: number;
  proposals: boolean;
  seoGenerator: boolean;
  customLora: boolean;
}

// Infinity = unlimited (enterprise)
export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  starter: {
    rendersPerMonth: 50,
    leadsPerMonth: 100,
    crmIntegrations: 0,
    proposals: false,
    seoGenerator: false,
    customLora: false,
  },
  growth: {
    rendersPerMonth: 250,
    leadsPerMonth: 500,
    crmIntegrations: 1,
    proposals: false,
    seoGenerator: false,
    customLora: false,
  },
  pro: {
    rendersPerMonth: 1000,
    leadsPerMonth: 2000,
    crmIntegrations: 99,
    proposals: true,
    seoGenerator: true,
    customLora: true,
  },
  agency: {
    rendersPerMonth: 5000,
    leadsPerMonth: 10000,
    crmIntegrations: 99,
    proposals: true,
    seoGenerator: true,
    customLora: true,
  },
  enterprise: {
    rendersPerMonth: Infinity,
    leadsPerMonth: Infinity,
    crmIntegrations: 99,
    proposals: true,
    seoGenerator: true,
    customLora: true,
  },
};

export function limitsForPlan(plan: PlanName): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
}
