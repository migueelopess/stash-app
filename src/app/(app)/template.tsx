/**
 * Transição suave entre páginas: o template remonta quando o segmento de rota
 * muda (dashboard → transações, etc.) e faz o conteúdo novo entrar com
 * fade + deslize. Mudanças só de searchParams (filtros) NÃO remontam.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      {children}
    </div>
  );
}
