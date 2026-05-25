import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTenant } from "@/lib/auth/tenant";
import { db } from "@/db/client";
import { brandkits, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { StripePortalButton } from "./StripePortalButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let slug = "";
  let plan = "starter";
  let hasStripeCustomer = false;

  try {
    const { tenant } = await requireTenant();
    slug = tenant.slug;
    plan = tenant.plan;
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenant.id))
      .limit(1);
    hasStripeCustomer = !!sub?.stripeCustomerId;
  } catch {
    // not authenticated
  }

  const origin = "https://your-domain.com"; // replaced at runtime by client
  const iframeSnippet = slug
    ? `<iframe\n  src="${origin}/embed/${slug}"\n  width="100%"\n  height="700"\n  frameborder="0"\n  allow="camera"\n  style="border-radius:16px"\n></iframe>`
    : "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Workspace, embed, and billing.</p>
      </div>

      {/* Embed */}
      <Card>
        <CardHeader>
          <CardTitle>Embed your widget</CardTitle>
          <CardDescription>
            Paste this snippet anywhere on your website — contact page, homepage, or a dedicated
            design page. Works with any site builder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {slug ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Iframe embed</p>
                <pre className="overflow-x-auto rounded-lg bg-muted px-4 py-3 text-xs leading-relaxed">
                  {iframeSnippet}
                </pre>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Direct link</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs">
                    /embed/{slug}
                  </code>
                  <a
                    href={`/embed/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
                  >
                    Preview →
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
                Replace <code className="font-mono text-xs">your-domain.com</code> with your
                actual domain. For custom subdomain setup (e.g.{" "}
                <code className="font-mono text-xs">design.yoursite.com</code>), contact support.
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sign in to see your embed snippet.</p>
          )}
        </CardContent>
      </Card>

      {/* Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Your current plan and usage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current plan</span>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold capitalize text-accent">
              {plan}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Billing</span>
            <span>Monthly</span>
          </div>
          <div className="pt-2">
            {hasStripeCustomer ? (
              <StripePortalButton />
            ) : (
              <a
                href="/pricing"
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
              >
                Upgrade plan →
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Danger zone</CardTitle>
          <CardDescription>Irreversible actions. Proceed carefully.</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            disabled
            className="rounded-lg border border-red-300 px-4 py-2 text-xs font-medium text-red-600 opacity-50 dark:border-red-800 dark:text-red-400"
          >
            Delete workspace
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Contact support to delete your workspace and all associated data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
