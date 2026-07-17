import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stash",
  description:
    "Gestão financeira pessoal com sincronização bancária automática",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Stash",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// Tema: preferência guardada (sistema/claro/escuro); corre antes da
// hidratação para evitar flash. Exposto em window.__aplicarTema para o
// seletor nas Definições reaplicar de imediato.
const scriptTema = `(function(){var m=window.matchMedia("(prefers-color-scheme: dark)");function pref(){try{return localStorage.getItem("tema")||"sistema"}catch(e){return "sistema"}}function aplicar(){var p=pref();var escuro=p==="escuro"||(p==="sistema"&&m.matches);document.documentElement.classList.toggle("dark",escuro)}aplicar();var t;m.addEventListener("change",function(){clearTimeout(t);t=setTimeout(aplicar,150)});window.__aplicarTema=aplicar})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-PT"
      suppressHydrationWarning
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script
          id="tema-sistema"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: scriptTema }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
