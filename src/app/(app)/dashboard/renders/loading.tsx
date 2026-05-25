export default function RendersLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-32 rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-video rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
