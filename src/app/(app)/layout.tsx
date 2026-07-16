import { BottomNav } from "@/components/bottom-nav";
import { SplashInicial } from "@/components/splash-inicial";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <SplashInicial />
      <main className="flex-1 p-4 pb-32">{children}</main>
      <BottomNav />
    </div>
  );
}
