import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
  vector,
} from "drizzle-orm/pg-core";

// =============================================================================
// Enums
// =============================================================================

export const planTier = pgEnum("plan_tier", [
  "starter",
  "growth",
  "pro",
  "agency",
  "enterprise",
]);

export const tenantStatus = pgEnum("tenant_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "suspended",
]);

export const leadStage = pgEnum("lead_stage", [
  "new",
  "engaged",
  "qualified",
  "consult_booked",
  "proposal_sent",
  "won",
  "lost",
  "nurture",
]);

export const leadTemperature = pgEnum("lead_temperature", [
  "hot",
  "warm",
  "cold",
]);

export const renderStatus = pgEnum("render_status", [
  "queued",
  "processing",
  "completed",
  "failed",
]);

export const proposalStatus = pgEnum("proposal_status", [
  "draft",
  "sent",
  "viewed",
  "signed",
  "deposit_paid",
  "expired",
]);

export const messageChannel = pgEnum("message_channel", [
  "email",
  "sms",
  "voice",
  "in_app",
]);

export const messageDirection = pgEnum("message_direction", [
  "inbound",
  "outbound",
]);

export const integrationProvider = pgEnum("integration_provider", [
  "gohighlevel",
  "hubspot",
  "jobber",
  "pipedrive",
  "webhook",
]);

export const userRole = pgEnum("user_role", [
  "owner",
  "admin",
  "designer",
  "viewer",
]);

export const vertical = pgEnum("vertical", [
  "cabinetry",
  "bathroom",
  "kitchen",
  "landscaping",
  "pool",
  "outdoor_structures",
  "full_renovation",
]);

// =============================================================================
// Tenants & users (multi-tenancy core)
// =============================================================================

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull().unique(),
    name: text("name").notNull(),
    plan: planTier("plan").notNull().default("starter"),
    status: tenantStatus("status").notNull().default("trialing"),
    primaryVertical: vertical("primary_vertical").notNull().default("cabinetry"),
    countryCode: varchar("country_code", { length: 2 }).notNull().default("US"),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    customDomain: varchar("custom_domain", { length: 255 }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("tenants_slug_idx").on(t.slug)],
);

export const brandkits = pgTable("brandkits", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" })
    .unique(),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 9 }).default("#0F172A"),
  accentColor: varchar("accent_color", { length: 9 }).default("#F59E0B"),
  fontFamily: varchar("font_family", { length: 64 }).default("Inter"),
  voice: jsonb("voice").$type<{
    tone: string;
    examples: string[];
    forbiddenPhrases: string[];
  }>(),
  styleLoraIds: text("style_lora_ids").array(),
  signaturePhotos: text("signature_photos").array(),
  contractorBio: text("contractor_bio"),
  licenseNumber: varchar("license_number", { length: 64 }),
  insuranceNote: text("insurance_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clerkId: varchar("clerk_id", { length: 128 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull(),
    fullName: text("full_name"),
    role: userRole("role").notNull().default("owner"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("users_tenant_idx").on(t.tenantId),
    index("users_clerk_idx").on(t.clerkId),
  ],
);

export const tenantSettings = pgTable("tenant_settings", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  widgetConfig: jsonb("widget_config").$type<{
    enabledStyles: string[];
    leadGateAfter: number;
    requirePhone: boolean;
    consentCopy: string;
  }>(),
  pricingRules: jsonb("pricing_rules").$type<{
    cabinetPerLinearFt?: number;
    countertopPerSqFt?: number;
    laborMultiplier?: number;
    minProjectValue?: number;
  }>(),
  followupConfig: jsonb("followup_config").$type<{
    enabled: boolean;
    cadenceHours: number[];
    pauseOnReply: boolean;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// =============================================================================
// Lead lifecycle
// =============================================================================

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    fullName: text("full_name"),
    source: varchar("source", { length: 64 }),
    score: integer("score").default(0),
    temperature: leadTemperature("temperature").default("cold"),
    stage: leadStage("stage").notNull().default("new"),
    zip: varchar("zip", { length: 16 }),
    notes: text("notes"),
    externalIds: jsonb("external_ids").$type<Record<string, string>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("leads_tenant_stage_idx").on(t.tenantId, t.stage),
    index("leads_tenant_score_idx").on(t.tenantId, t.score),
    index("leads_email_idx").on(t.email),
  ],
);

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    anonymousId: varchar("anonymous_id", { length: 64 }),
    messages: jsonb("messages")
      .$type<
        Array<{
          role: "user" | "assistant" | "tool";
          content: string;
          ts: string;
          toolUse?: Record<string, unknown>;
        }>
      >()
      .notNull()
      .default(sql`'[]'::jsonb`),
    summary: text("summary"),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("chat_sessions_lead_idx").on(t.leadId)],
);

export const projectScopes = pgTable(
  "project_scopes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    vertical: vertical("vertical").notNull().default("cabinetry"),
    dimensions: jsonb("dimensions").$type<{
      widthFt?: number;
      lengthFt?: number;
      heightFt?: number;
      linearFt?: number;
      sqFt?: number;
    }>(),
    materials: jsonb("materials").$type<{
      cabinets?: string;
      countertop?: string;
      backsplash?: string;
      flooring?: string;
      hardware?: string;
    }>(),
    timeline: varchar("timeline", { length: 64 }),
    budgetBand: varchar("budget_band", { length: 32 }),
    confidence: integer("confidence").default(50),
    rawNotes: text("raw_notes"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("project_scopes_lead_idx").on(t.leadId)],
);

export const estimates = pgTable("estimates", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  scopeId: uuid("scope_id")
    .notNull()
    .references(() => projectScopes.id, { onDelete: "cascade" }),
  lineItems: jsonb("line_items")
    .$type<
      Array<{
        label: string;
        quantity: number;
        unit: string;
        unitPriceCents: number;
        totalCents: number;
      }>
    >()
    .notNull()
    .default(sql`'[]'::jsonb`),
  lowCents: integer("low_cents").notNull(),
  highCents: integer("high_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),
    scopeId: uuid("scope_id")
      .notNull()
      .references(() => projectScopes.id, { onDelete: "cascade" }),
    estimateId: uuid("estimate_id").references(() => estimates.id, {
      onDelete: "set null",
    }),
    // Unguessable token for the public homeowner-facing proposal URL (/p/[token])
    accessToken: varchar("access_token", { length: 64 }).notNull().unique(),
    title: text("title"),
    content: jsonb("content").$type<{
      intro: string;
      scopeSummary: string;
      whyUs: string;
      processSteps: Array<{ title: string; description: string }>;
      terms: string;
    }>(),
    pdfUrl: text("pdf_url"),
    webUrl: text("web_url"),
    status: proposalStatus("status").notNull().default("draft"),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    signerName: varchar("signer_name", { length: 128 }),
    depositPaidAt: timestamp("deposit_paid_at", { withTimezone: true }),
    depositCents: integer("deposit_cents"),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 128 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("proposals_status_idx").on(t.status),
    index("proposals_lead_idx").on(t.leadId),
  ],
);

// =============================================================================
// Visualization (renders)
// =============================================================================

export const photoUploads = pgTable(
  "photo_uploads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),
    r2Key: text("r2_key").notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    widthPx: integer("width_px"),
    heightPx: integer("height_px"),
    blurScore: integer("blur_score"),
    exifStripped: boolean("exif_stripped").notNull().default(true),
    mimeType: varchar("mime_type", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("photo_uploads_hash_idx").on(t.contentHash),
    index("photo_uploads_lead_idx").on(t.leadId),
  ],
);

export const segmentations = pgTable("segmentations", {
  id: uuid("id").defaultRandom().primaryKey(),
  photoId: uuid("photo_id")
    .notNull()
    .references(() => photoUploads.id, { onDelete: "cascade" }),
  masks: jsonb("masks")
    .$type<
      Record<
        string,
        {
          bbox: [number, number, number, number];
          maskR2Key: string;
          score: number;
        }
      >
    >()
    .notNull(),
  modelVersion: varchar("model_version", { length: 64 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const styles = pgTable("styles", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 128 }).notNull(),
  vertical: vertical("vertical").notNull(),
  referenceImages: text("reference_images").array(),
  loraId: varchar("lora_id", { length: 128 }),
  promptTemplate: jsonb("prompt_template").$type<{
    subject: string;
    materials: Record<string, string>;
    lighting: string;
    quality: string;
  }>(),
  isGlobal: boolean("is_global").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const renders = pgTable(
  "renders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    photoId: uuid("photo_id")
      .notNull()
      .references(() => photoUploads.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),
    styleId: uuid("style_id").references(() => styles.id, {
      onDelete: "set null",
    }),
    parentRenderId: uuid("parent_render_id"),
    status: renderStatus("status").notNull().default("queued"),
    promptJson: jsonb("prompt_json").$type<Record<string, unknown>>(),
    outputR2Key: text("output_r2_key"),
    thumbR2Key: text("thumb_r2_key"),
    modelName: varchar("model_name", { length: 128 }),
    modelProvider: varchar("model_provider", { length: 64 }),
    costCents: integer("cost_cents").default(0),
    qualityScore: integer("quality_score"),
    durationMs: integer("duration_ms"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("renders_tenant_status_idx").on(t.tenantId, t.status),
    index("renders_lead_idx").on(t.leadId),
  ],
);

// =============================================================================
// Communications & follow-up
// =============================================================================

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),
    channel: messageChannel("channel").notNull(),
    direction: messageDirection("direction").notNull(),
    fromAddress: varchar("from_address", { length: 255 }),
    toAddress: varchar("to_address", { length: 255 }),
    subject: text("subject"),
    body: text("body").notNull(),
    status: varchar("status", { length: 32 }),
    providerMessageId: varchar("provider_message_id", { length: 128 }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("messages_lead_idx").on(t.leadId)],
);

export const followupSequences = pgTable("followup_sequences", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  triggerEvent: varchar("trigger_event", { length: 64 }).notNull(),
  steps: jsonb("steps")
    .$type<
      Array<{
        delayHours: number;
        channel: "email" | "sms";
        templateKey: string;
        condition?: { lead_temperature?: string };
      }>
    >()
    .notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const followupRuns = pgTable(
  "followup_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sequenceId: uuid("sequence_id")
      .notNull()
      .references(() => followupSequences.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    currentStep: integer("current_step").notNull().default(0),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    paused: boolean("paused").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("followup_runs_next_idx").on(t.nextRunAt),
    unique().on(t.sequenceId, t.leadId),
  ],
);

// =============================================================================
// Integrations (CRM sync)
// =============================================================================

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: integrationProvider("provider").notNull(),
    credentialsEncrypted: text("credentials_encrypted").notNull(),
    fieldMap: jsonb("field_map").$type<Record<string, string>>(),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.tenantId, t.provider)],
);

export const syncEvents = pgTable(
  "sync_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    integrationId: uuid("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    direction: messageDirection("direction").notNull(),
    entity: varchar("entity", { length: 64 }).notNull(),
    externalId: varchar("external_id", { length: 128 }),
    payload: jsonb("payload"),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    retries: integer("retries").notNull().default(0),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sync_events_status_idx").on(t.status)],
);

// =============================================================================
// AI knowledge (RAG)
// =============================================================================

export const vectorChunks = pgTable(
  "vector_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 64 }).notNull(),
    sourceId: varchar("source_id", { length: 128 }),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1024 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("vector_chunks_tenant_idx").on(t.tenantId)],
);

// =============================================================================
// SEO + reviews + billing + audit
// =============================================================================

export const seoPages = pgTable(
  "seo_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    service: varchar("service", { length: 128 }).notNull(),
    city: varchar("city", { length: 128 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    html: text("html"),
    schemaJson: jsonb("schema_json"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    views: integer("views").notNull().default(0),
    leadsCaptured: integer("leads_captured").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.tenantId, t.slug)],
);

export const reviewRequests = pgTable("review_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  platform: varchar("platform", { length: 32 }),
  rating: integer("rating"),
  responseStatus: varchar("response_status", { length: 32 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 128 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 128 }),
  plan: planTier("plan").notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const usageMeters = pgTable(
  "usage_meters",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    period: varchar("period", { length: 7 }).notNull(), // YYYY-MM
    rendersUsed: integer("renders_used").notNull().default(0),
    leadsReceived: integer("leads_received").notNull().default(0),
    messagesSent: integer("messages_sent").notNull().default(0),
    aiTokensIn: integer("ai_tokens_in").notNull().default(0),
    aiTokensOut: integer("ai_tokens_out").notNull().default(0),
    aiCostCents: integer("ai_cost_cents").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.period] })],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    actorId: uuid("actor_id"),
    action: varchar("action", { length: 64 }).notNull(),
    entity: varchar("entity", { length: 64 }).notNull(),
    entityId: varchar("entity_id", { length: 128 }),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: varchar("ip", { length: 64 }),
    userAgent: text("user_agent"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_tenant_at_idx").on(t.tenantId, t.at)],
);

// =============================================================================
// Type exports for convenience
// =============================================================================

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type Brandkit = typeof brandkits.$inferSelect;
export type User = typeof users.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type ProjectScope = typeof projectScopes.$inferSelect;
export type Estimate = typeof estimates.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type PhotoUpload = typeof photoUploads.$inferSelect;
export type Render = typeof renders.$inferSelect;
export type Style = typeof styles.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type Vertical = (typeof vertical.enumValues)[number];
export type PlanTier = (typeof planTier.enumValues)[number];
