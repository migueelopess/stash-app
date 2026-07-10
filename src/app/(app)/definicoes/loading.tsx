export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-4 pt-1">
      <div className="h-7 w-36 rounded-lg bg-muted" />
      <div className="h-16 rounded-2xl bg-muted" />
      <div className="flex flex-col gap-2">
        <div className="h-16 rounded-2xl bg-muted" />
        <div className="h-16 rounded-2xl bg-muted" />
        <div className="h-16 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
