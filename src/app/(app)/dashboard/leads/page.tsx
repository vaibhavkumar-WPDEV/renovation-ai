import { Card, CardContent } from "@/components/ui/card";

export default function LeadsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground">
          All leads captured through the widget, sorted by score.
        </p>
      </div>
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No leads yet. Embed the widget on your site to start capturing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
