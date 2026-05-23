import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BrandkitPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">BrandKit</h1>
        <p className="text-sm text-muted-foreground">
          Tell the AI how to sound and look like your business.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming in week 2</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Logo, colors, voice tone, signature photos, license info, and
          (Pro tier) custom-trained style LoRA upload.
        </CardContent>
      </Card>
    </div>
  );
}
