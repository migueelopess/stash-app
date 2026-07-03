import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <main className="flex-1 p-4 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
