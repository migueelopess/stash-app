export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-4 pt-1">
      <div className="h-7 w-40 rounded-lg bg-muted" />
      <div className="h-36 rounded-3xl bg-muted" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-24 rounded-2xl bg-muted" />
        <div className="h-24 rounded-2xl bg-muted" />
        <div className="h-24 rounded-2xl bg-muted" />
      </div>
      <div className="h-56 rounded-2xl bg-muted" />
      <div className="h-40 rounded-2xl bg-muted" />
    </div>
  );
}
