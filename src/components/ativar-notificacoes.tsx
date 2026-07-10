"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import {
  guardarSubscricaoPush,
  removerSubscricaoPush,
} from "@/app/(app)/definicoes/actions";
import { Button } from "@/components/ui/button";

type Estado =
  | "a-carregar"
  | "indisponivel" // sem service worker (dev) ou browser sem suporte
  | "bloqueado" // permissão negada no browser
  | "desativado"
  | "ativado";

function base64ParaUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const seguro = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(seguro);
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

export function AtivarNotificacoes() {
  const [estado, setEstado] = useState<Estado>("a-carregar");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    (async () => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setEstado("indisponivel");
        return;
      }
      const registo = await navigator.serviceWorker.getRegistration();
      if (!registo) {
        setEstado("indisponivel");
        return;
      }
      if (Notification.permission === "denied") {
        setEstado("bloqueado");
        return;
      }
      const subscricao = await registo.pushManager.getSubscription();
      setEstado(subscricao ? "ativado" : "desativado");
    })();
  }, []);

  const ativar = async () => {
    setOcupado(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "bloqueado" : "desativado");
        return;
      }
      const registo = await navigator.serviceWorker.ready;
      const chave = base64ParaUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      );
      const subscricao = await registo.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: chave.buffer as ArrayBuffer,
      });
      const json = subscricao.toJSON();
      const resultado = await guardarSubscricaoPush({
        endpoint: subscricao.endpoint,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      setEstado(resultado.ok ? "ativado" : "desativado");
    } catch (e) {
      console.error("Erro ao ativar notificações:", e);
      setEstado("desativado");
    } finally {
      setOcupado(false);
    }
  };

  const desativar = async () => {
    setOcupado(true);
    try {
      const registo = await navigator.serviceWorker.ready;
      const subscricao = await registo.pushManager.getSubscription();
      if (subscricao) {
        await removerSubscricaoPush(subscricao.endpoint);
        await subscricao.unsubscribe();
      }
      setEstado("desativado");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
        {estado === "ativado" ? (
          <BellRing className="size-5" />
        ) : (
          <Bell className="size-5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Notificações</p>
        <p className="text-xs text-muted-foreground">
          {estado === "ativado" && "Alertas de orçamentos e renovações ativos"}
          {estado === "desativado" && "Avisos de orçamentos no telemóvel"}
          {estado === "bloqueado" &&
            "Bloqueadas no browser — permite nas definições do site"}
          {estado === "indisponivel" &&
            "Disponível na app instalada (produção)"}
          {estado === "a-carregar" && "A verificar…"}
        </p>
      </div>
      {estado === "desativado" && (
        <Button size="sm" onClick={ativar} disabled={ocupado}>
          Ativar
        </Button>
      )}
      {estado === "ativado" && (
        <Button size="sm" variant="outline" onClick={desativar} disabled={ocupado}>
          <BellOff className="size-4" />
        </Button>
      )}
    </div>
  );
}
