import { iniciais } from "@/lib/perfil";
import { cn } from "@/lib/utils";

/**
 * Avatar do utilizador: mostra a foto se existir, senão as iniciais sobre a
 * cor escolhida. Usado no cabeçalho do dashboard e na página de perfil.
 */
export function AvatarPerfil({
  nome,
  email,
  avatarUrl,
  cor,
  className,
  textoClassName,
}: {
  nome: string | null;
  email: string;
  avatarUrl: string | null;
  cor: string;
  className?: string;
  textoClassName?: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        textoClassName,
        className
      )}
      style={{ backgroundColor: cor }}
    >
      {iniciais(nome, email)}
    </span>
  );
}
