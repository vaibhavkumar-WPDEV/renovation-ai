import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stats = [
  { label: "New leads (7d)", value: "—", hint: "Connect your widget to start" },
  { label: "Renders generated", value: "—" },
  { label: "Proposals signed", value: "—" },
  { label: "Conversion rate", value: "—" },
];

export default function DashboardHome() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to RenovateAI. Finish the 4-step setup below to start
          capturing leads.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardDescription>{s.label}</CardDescription>
              <CardTitle>{s.value}</CardTitle>
            </CardHeader>
            {s.hint && (
              <CardContent>
                <p className="text-xs text-muted-foreground">{s.hint}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick start</CardTitle>
          <CardDescription>
            ~30 minutes to your first AI-rendered lead.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            "Upload your logo, color, and 5 signature project photos",
            "Connect GoHighLevel (or another CRM) — 2 clicks",
            "Embed the widget on your website (one <script> tag)",
            "Send one test lead through the funnel end-to-end",
          ].map((step, i) => (
            <div key={step} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {i + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
