import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Notificacao {
  titulo: string;
  corpo: string;
  url?: string;
}

function configurar(): boolean {
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  const assunto = process.env.VAPID_SUBJECT;
  if (!publica || !privada || !assunto) return false;
  webpush.setVapidDetails(assunto, publica, privada);
  return true;
}

/**
 * Envia uma notificação push a todas as subscrições do utilizador.
 * Subscrições mortas (410/404) são removidas. Falhas não propagam —
 * notificar nunca pode partir um sync.
 */
export async function enviarPush(
  supabase: SupabaseClient,
  userId: string,
  notificacao: Notificacao
): Promise<void> {
  try {
    if (!configurar()) return;

    const { data: subscricoes } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (!subscricoes || subscricoes.length === 0) return;

    const payload = JSON.stringify(notificacao);

    await Promise.all(
      subscricoes.map(async (s) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            payload
          );
        } catch (e) {
          const codigo = (e as { statusCode?: number }).statusCode;
          if (codigo === 404 || codigo === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", s.id);
          } else {
            console.error("Erro ao enviar push:", codigo, e);
          }
        }
      })
    );
  } catch (e) {
    console.error("Erro no envio de notificações:", e);
  }
}
