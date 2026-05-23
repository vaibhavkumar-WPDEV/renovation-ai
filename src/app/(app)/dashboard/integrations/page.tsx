import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const providers = [
  { name: "GoHighLevel", status: "Ready week 4", featured: true },
  { name: "HubSpot", status: "Ready week 13" },
  { name: "Jobber", status: "Ready week 13" },
  { name: "Pipedrive", status: "Ready week 13" },
  { name: "Zapier", status: "Ready month 8" },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Push leads, deals, and stage changes into your existing CRM.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {providers.map((p) => (
          <Card key={p.name}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {p.name}
                {p.featured && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                    Priority
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{p.status}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
