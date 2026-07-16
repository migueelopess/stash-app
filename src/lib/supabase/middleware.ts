import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Não remover: manter a validação entre createServerClient e a resposta
  // evita sessões desincronizadas e logouts aleatórios.
  // getClaims() valida o JWT localmente (WebCrypto + JWKS em cache) quando o
  // projeto usa chaves assimétricas — sem ida à rede em cada pedido, ao
  // contrário do getUser(). Com chave simétrica cai no mesmo comportamento
  // do getUser(), portanto nunca é mais lento. Renova a sessão se expirou.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const isPublicPath =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/api");

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
