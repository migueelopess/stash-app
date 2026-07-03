import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/login/actions";

export default async function DefinicoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Definições</h1>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Sessão iniciada como</p>
        <p className="text-sm font-medium">{user?.email}</p>
      </div>
      <form action={logout}>
        <Button type="submit" variant="outline">
          Terminar sessão
        </Button>
      </form>
    </div>
  );
}
