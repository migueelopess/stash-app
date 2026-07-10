export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-4 pt-1">
      <div className="h-7 w-40 rounded-lg bg-muted" />
      <div className="h-28 rounded-2xl bg-muted" />
      <div className="h-40 rounded-2xl bg-muted" />
      <div className="h-10 rounded-xl bg-muted" />
    </div>
  );
}
