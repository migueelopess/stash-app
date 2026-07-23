"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { AvatarPerfil } from "@/components/avatar-perfil";
import { BotaoSubmit } from "@/components/botao-submit";
import { SeletorCor } from "@/components/form/seletor-cor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  atualizarPerfil,
  definirAvatar,
  removerAvatar,
} from "@/app/(app)/definicoes/actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Recorta a imagem ao centro (quadrado) e reduz a 256px WebP. */
async function prepararImagem(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const lado = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - lado) / 2;
  const sy = (bitmap.height - lado) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");
  ctx.drawImage(bitmap, sx, sy, lado, lado, 0, 0, 256, 256);
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob((b) => res(b), "image/webp", 0.85)
  );
  if (!blob) throw new Error("falha a converter imagem");
  return blob;
}

export function EditorPerfil({
  userId,
  nome,
  email,
  avatarUrl,
  cor,
}: {
  userId: string;
  nome: string | null;
  email: string;
  avatarUrl: string | null;
  cor: string;
}) {
  const router = useRouter();
  const inputFicheiro = useRef<HTMLInputElement>(null);
  const [urlAtual, setUrlAtual] = useState(avatarUrl);
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aRemover, iniciarRemocao] = useTransition();

  async function escolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-selecionar o mesmo ficheiro
    if (!file) return;
    setErro(null);
    setACarregar(true);
    try {
      const blob = await prepararImagem(file);
      const supabase = createClient();
      const caminho = `${userId}/avatar.webp`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(caminho, blob, {
          upsert: true,
          contentType: "image/webp",
          cacheControl: "3600",
        });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(caminho);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const res = await definirAvatar(url);
      if (!res.ok) throw new Error("falha a guardar");
      setUrlAtual(url);
      router.refresh();
    } catch (err) {
      console.error(err);
      setErro("Não consegui carregar a foto. Tenta outra.");
    } finally {
      setACarregar(false);
    }
  }

  function apagarFoto() {
    iniciarRemocao(async () => {
      await removerAvatar();
      setUrlAtual(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar grande com botão de câmara */}
      <div className="relative">
        <AvatarPerfil
          nome={nome}
          email={email}
          avatarUrl={urlAtual}
          cor={cor}
          className="size-24"
          textoClassName="text-3xl"
        />
        <button
          type="button"
          onClick={() => inputFicheiro.current?.click()}
          disabled={aCarregar}
          aria-label="Mudar foto de perfil"
          className={cn(
            "absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-md transition-transform active:scale-90",
            aCarregar && "opacity-70"
          )}
        >
          {aCarregar ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Camera className="size-4" />
          )}
        </button>
        <input
          ref={inputFicheiro}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={escolherFoto}
        />
      </div>

      {urlAtual && (
        <button
          type="button"
          onClick={apagarFoto}
          disabled={aRemover}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-rose-500"
        >
          {aRemover ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
          Remover foto
        </button>
      )}

      {erro && <p className="text-xs text-rose-500">{erro}</p>}

      {/* Nome + cor do avatar */}
      <form
        action={atualizarPerfil}
        className="flex w-full flex-col gap-4 pt-2"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            name="nome"
            defaultValue={nome ?? ""}
            placeholder="O teu nome"
            maxLength={60}
            autoComplete="name"
          />
        </div>

        {!urlAtual && (
          <div className="flex flex-col gap-2">
            <Label>Cor do avatar</Label>
            <SeletorCor name="cor" valorInicial={cor} />
          </div>
        )}

        <BotaoSubmit className="w-full" pendingText="A guardar…">
          Guardar
        </BotaoSubmit>
      </form>
    </div>
  );
}
