import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome 👋</h1>
      <p className="mt-2 text-muted-foreground">
        Let&apos;s get your AI sales engine live in 4 steps.
      </p>

      <div className="mt-10 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Step 1 — Workspace</CardTitle>
            <CardDescription>
              Name your business and choose your primary vertical.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Wizard ships in week 2.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
