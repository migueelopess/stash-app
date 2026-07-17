import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Só cacheamos ficheiros estáticos IMUTÁVEIS (hash no nome — nunca ficam
// obsoletos). As navegações e os dados (RSC/API) vão SEMPRE à rede: assim
// a app nunca fica presa numa versão antiga em cache.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({ cacheName: "next-static" }),
    },
    {
      matcher: ({ request }) =>
        request.destination === "image" ||
        request.destination === "font",
      handler: new StaleWhileRevalidate({ cacheName: "assets" }),
    },
  ],
});

serwist.addEventListeners();

// Ao ativar, apagar caches antigas (versões anteriores serviam páginas em
// cache e prendiam a app). Mantém só o precache do Serwist e as novas.
const CACHES_ATUAIS = ["next-static", "assets"];
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(
        nomes
          .filter(
            (n) => !n.startsWith("serwist") && !CACHES_ATUAIS.includes(n)
          )
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

// Notificações push (alertas de orçamentos, renovação PSD2...)
self.addEventListener("push", (event) => {
  let dados: { titulo?: string; corpo?: string; url?: string } = {};
  try {
    dados = event.data?.json() ?? {};
  } catch {
    dados = { corpo: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(dados.titulo ?? "Stash", {
      body: dados.corpo,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: dados.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((janelas) => {
      const aberta = janelas.find((j) => "focus" in j);
      if (aberta) {
        aberta.navigate(url);
        return aberta.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
