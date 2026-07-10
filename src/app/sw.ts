import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Notificações push (alertas de orçamentos, renovação PSD2...)
self.addEventListener("push", (event) => {
  let dados: { titulo?: string; corpo?: string; url?: string } = {};
  try {
    dados = event.data?.json() ?? {};
  } catch {
    dados = { corpo: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(dados.titulo ?? "Gestão Financeira", {
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
