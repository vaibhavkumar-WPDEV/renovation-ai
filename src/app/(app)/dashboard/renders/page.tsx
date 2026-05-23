import { Card, CardContent } from "@/components/ui/card";

export default function RendersPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Renders</h1>
        <p className="text-sm text-muted-foreground">
          Every AI render generated for your homeowners, linked to leads.
        </p>
      </div>
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No renders yet. Renders appear here as homeowners use the widget.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
