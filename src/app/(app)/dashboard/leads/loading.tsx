export default function LeadsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-32 rounded-lg bg-muted" />
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="h-12 border-b border-border bg-muted/50" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
            <div className="ml-auto h-5 w-12 rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
