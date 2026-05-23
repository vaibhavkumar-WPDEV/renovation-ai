import Link from "next/link";

const features = [
  {
    title: "Photoreal AI renders",
    body: "Homeowners upload a photo of their kitchen. FLUX.2 generates a magazine-quality vision of your work — in 60 seconds, branded to you.",
  },
  {
    title: "24/7 AI consultant",
    body: "Claude-powered chat qualifies, scopes, and books — using your tone, your prices, your portfolio. Never miss a lead at 11 p.m. again.",
  },
  {
    title: "Win back lost leads",
    body: "Recovers the 40–60% of design-phase dropouts with multi-channel follow-up that knows what each homeowner actually wants.",
  },
  {
    title: "Native CRM sync",
    body: "GoHighLevel, HubSpot, Jobber — leads flow into the pipeline your team already runs. No double entry, ever.",
  },
];

const tiers = [
  {
    name: "Starter",
    price: 147,
    blurb: "Solo cabinetmakers and small renovators",
    points: ["50 renders / mo", "100 leads / mo", "AI chat + lead capture"],
  },
  {
    name: "Growth",
    price: 397,
    blurb: "Mid-market design-build firms",
    points: [
      "250 renders / mo",
      "500 leads / mo",
      "Follow-up, scope, estimator",
      "1 CRM integration",
    ],
    highlighted: true,
  },
  {
    name: "Pro",
    price: 797,
    blurb: "Multi-location remodelers",
    points: [
      "1,000 renders / mo",
      "Custom-trained style LoRA",
      "Proposals + SEO + reviews",
      "All CRM integrations",
    ],
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
            RenovateAI
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground">
              Pricing
            </a>
            <Link
              href="/sign-in"
              className="text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-foreground px-3.5 py-2 text-sm font-medium text-background hover:opacity-90"
            >
              Start free trial
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Built for cabinetry, bath, and renovation pros
            </div>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Turn website visitors into{" "}
              <span className="text-accent">signed deposits.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              RenovateAI is the white-labeled AI sales engine for renovation
              contractors. Photoreal renders of their actual space. 24/7 AI
              consultations. Automated follow-up. CRM-native.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/sign-up"
                className="rounded-lg bg-foreground px-5 py-3 text-sm font-medium text-background hover:opacity-90"
              >
                Start 14-day free trial
              </Link>
              <Link
                href="/demo"
                className="rounded-lg border border-border px-5 py-3 text-sm font-medium hover:bg-muted"
              >
                Watch 90-second demo →
              </Link>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              No credit card required · Setup in &lt; 30 minutes · Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            One AI stack. The whole sales funnel.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Built for the 40–60% of leads that disappear in the design phase.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-muted/40 p-6"
              >
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Pricing that pays for itself with one closed kitchen.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            14-day free trial on every plan. Annual saves 17%.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={
                  "rounded-2xl border p-6 " +
                  (tier.highlighted
                    ? "border-accent bg-accent/5 ring-1 ring-accent"
                    : "border-border")
                }
              >
                {tier.highlighted && (
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-accent">
                    Most popular
                  </div>
                )}
                <h3 className="text-xl font-semibold">{tier.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{tier.blurb}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">
                    ${tier.price}
                  </span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {tier.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/sign-up?plan=${tier.name.toLowerCase()}`}
                  className={
                    "mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-medium " +
                    (tier.highlighted
                      ? "bg-foreground text-background hover:opacity-90"
                      : "border border-border hover:bg-muted")
                  }
                >
                  Start {tier.name} trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            See your customers&apos; jaws drop.
          </h2>
          <p className="mt-3 text-muted-foreground">
            One Loom demo. We&apos;ll show you exactly what RenovateAI looks like on{" "}
            <em>your</em> website.
          </p>
          <Link
            href="/demo"
            className="mt-8 inline-block rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-90"
          >
            Book a 15-minute demo →
          </Link>
        </div>
      </section>

      <footer className="text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 RenovateAI. Built for contractors who hate marketplaces.</span>
          <div className="flex gap-5">
            <a href="/privacy" className="hover:text-foreground">Privacy</a>
            <a href="/terms" className="hover:text-foreground">Terms</a>
            <a href="/security" className="hover:text-foreground">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
