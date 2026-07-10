export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-4 pt-1">
      <div className="h-7 w-28 rounded-lg bg-muted" />
      <div className="h-24 rounded-2xl bg-muted" />
      <div className="h-10 w-20 rounded-lg bg-muted" />
      <div className="h-11 rounded-xl bg-muted" />
      <div className="h-16 rounded-xl bg-muted" />
      <div className="h-10 rounded-xl bg-muted" />
    </div>
  );
}
