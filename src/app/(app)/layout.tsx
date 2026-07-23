import { BottomNav } from "@/components/bottom-nav";
import { FundoAnimado } from "@/components/fundo-animado";
import { SplashInicial } from "@/components/splash-inicial";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <FundoAnimado />
      <SplashInicial />
      <main className="relative z-10 flex-1 p-4 pb-32">{children}</main>
      <BottomNav />
    </div>
  );
}
