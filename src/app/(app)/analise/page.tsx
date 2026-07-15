import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Minus,
  Store,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { ControlosAnalise } from "@/components/controlos-analise";
import { IconeCategoria } from "@/components/icone-categoria";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  agregarComerciantes,
  chaveMes,
  compararCategorias,
  compararComerciantes,
  historicoMensal,
  resumoComparativo,
  type ItemComparado,
  type TipoAnalise,
  type TxAnalise,
} from "@/lib/analise";
import { carregarCoresOverride, corCategoria } from "@/lib/cores";
import { formatarEuros } from "@/lib/format";
import { chaveDoNome, resolverNome } from "@/lib/nomes-comerciantes";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const MESES_FETCH = 8;

const formatoMesLongo = new Intl.DateTimeFormat("pt-PT", {
  month: "long",
  year: "numeric",
});
const formatoMesCurto = new Intl.DateTimeFormat("pt-PT", { month: "long" });

interface Linha {
  booking_date: string;
  amount: string;
  description: string | null;
  counterparty: string | null;
  category_id: string | null;
  is_movement: boolean;
  categories: { name: string; color: string | null; icon: string | null } | null;
}

function opcoesDeMes(): { valor: string; rotulo: string }[] {
  const opcoes: { valor: string; rotulo: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < 12; i++) {
    opcoes.push({ valor: chaveMes(d), rotulo: formatoMesLongo.format(d) });
    d.setMonth(d.getMonth() - 1);
  }
  return opcoes;
}

/** Etiqueta de variação (seta + %/valor). */
function Delta({
  dif,
  pct,
  bomSeSobe,
  unidade = "eur",
}: {
  dif: number;
  pct: number | null;
  bomSeSobe: boolean;
  unidade?: "eur" | "pp";
}) {
  if (Math.abs(dif) < 0.01) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        <Minus className="size-3" /> igual
      </span>
    );
  }
  const sobe = dif > 0;
  const bom = sobe === bomSeSobe;
  const texto =
    pct !== null
      ? `${sobe ? "+" : ""}${pct}%`
      : unidade === "pp"
        ? `${sobe ? "+" : "−"}${Math.abs(Math.round(dif))} pp`
        : `${sobe ? "+" : "−"}${formatarEuros(Math.abs(dif))}`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums",
        bom
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400"
      )}
    >
      {sobe ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {texto}
    </span>
  );
}

/** Linha comparada (categoria ou comerciante), opcionalmente com link. */
function LinhaComparada({
  item,
  bomSeSobe,
  href,
  legenda,
  semDelta,
}: {
  item: ItemComparado;
  bomSeSobe: boolean;
  href?: string;
  legenda?: string;
  semDelta?: boolean;
}) {
  const trackMax = Math.max(item.atual, item.media, 1);
  const conteudo = (
    <>
      <div className="flex items-center gap-3">
        <IconeCategoria icone={item.icone} cor={item.cor} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.rotulo}</p>
          <p className="truncate text-xs text-muted-foreground">
            {legenda ?? `habitual ${formatarEuros(item.media)}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <p className="text-sm font-bold tabular-nums">
            {formatarEuros(item.atual)}
          </p>
          {!semDelta && (
            <Delta dif={item.diferenca} pct={item.pct} bomSeSobe={bomSeSobe} />
          )}
        </div>
        {href && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${(item.atual / trackMax) * 100}%`, backgroundColor: item.cor }}
        />
        {!semDelta && item.media > 0 && (
          <span
            className="absolute top-[-2px] h-3 w-0.5 rounded bg-foreground/50"
            style={{ left: `calc(${(item.media / trackMax) * 100}% - 1px)` }}
          />
        )}
      </div>
    </>
  );

  const classe =
    "flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-sm";
  return href ? (
    <Link href={href} className={cn(classe, "transition-all hover:bg-muted/40 active:scale-[0.99]")}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

export default async function AnalisePage({
  searchParams,
}: {
  searchParams: Promise<{
    mes?: string;
    tipo?: string;
    cat?: string;
    dm?: string;
  }>;
}) {
  const sp = await searchParams;
  const agora = new Date();
  const mesAtual = chaveMes(agora);
  const mes = sp.mes ?? mesAtual;
  const tipo: TipoAnalise = sp.tipo === "ganhos" ? "ganhos" : "gastos";
  const catAlvo = sp.cat;
  const bomSeSobe = tipo === "ganhos";
  // Mês em foco dentro do drill-in (barra clicada) ou "todos os meses"
  const dmAll = Boolean(catAlvo) && sp.dm === "all";
  const dmMes = catAlvo && !dmAll ? sp.dm ?? mes : mes;

  const supabase = await createClient();
  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - MESES_FETCH);
  inicio.setDate(1);

  const [{ data: transacoesRaw }, { data: nomesRaw }, overrides] =
    await Promise.all([
      supabase
        .from("transactions")
        .select(
          "booking_date, amount, description, counterparty, category_id, is_movement, categories (name, color, icon)"
        )
        .gte("booking_date", inicio.toISOString().slice(0, 10)),
      supabase.from("merchant_names").select("match_value, display_name"),
      carregarCoresOverride(supabase),
    ]);

  const nomes = new Map(
    (nomesRaw ?? []).map((n) => [n.match_value, n.display_name])
  );

  const txs: TxAnalise[] = ((transacoesRaw ?? []) as unknown as Linha[]).map(
    (t) => ({
      booking_date: t.booking_date,
      amount: Number(t.amount),
      movimento: t.is_movement,
      categoria: t.categories?.name ?? null,
      categoryId: t.category_id,
      cor: corCategoria(overrides, t.category_id, t.categories?.color) ?? "#94a3b8",
      icone: t.categories?.icon ?? null,
      chave: chaveDoNome(t.description, t.counterparty),
      nomeComerciante: resolverNome(t.description, t.counterparty, nomes),
    })
  );

  const resumo = resumoComparativo(txs, mes, agora);
  const meses = opcoesDeMes();
  const rotuloTipo = tipo === "gastos" ? "Gasto" : "Recebido";
  const baseHref = `/analise?mes=${mes}&tipo=${tipo}`;

  const heroAtual = resumo
    ? tipo === "gastos"
      ? resumo.gastoAtual
      : resumo.ganhoAtual
    : 0;
  const heroDif = resumo ? (tipo === "gastos" ? resumo.gastoDif : resumo.ganhoDif) : 0;
  const heroPct = resumo ? (tipo === "gastos" ? resumo.gastoPct : resumo.ganhoPct) : null;
  const heroMedia = resumo ? (tipo === "gastos" ? resumo.gastoMedia : resumo.ganhoMedia) : 0;
  const heroSubeBom = tipo === "ganhos";

  // ---- Drill-in de categoria ----
  const nomeCategoria = catAlvo
    ? txs.find((t) => t.categoryId === catAlvo)?.categoria ?? "Categoria"
    : null;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href={catAlvo ? baseHref : "/"} />}
        >
          <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-xl font-bold">
            {catAlvo ? nomeCategoria : "Análise"}
          </h1>
          <p className="text-xs capitalize text-muted-foreground">
            {catAlvo && dmAll
              ? "todos os meses"
              : `${formatoMesCurto.format(
                  new Date(`${catAlvo ? dmMes : mes}-01T12:00:00`)
                )}${
                  (catAlvo ? dmMes : mes) === mesAtual
                    ? ` · até dia ${agora.getDate()}`
                    : catAlvo
                      ? ""
                      : " · mês completo"
                }`}
          </p>
        </div>
      </div>

      {!catAlvo && (
        <ControlosAnalise meses={meses} mes={mes} tipo={tipo} />
      )}

      {!resumo ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center">
          <TrendingUp className="size-9 text-primary" />
          <p className="text-sm font-medium">Sem histórico para comparar</p>
          <p className="text-xs text-muted-foreground">
            Escolhe um mês que tenha meses anteriores com transações.
          </p>
        </div>
      ) : catAlvo ? (
        <DrillCategoria
          txs={txs}
          mes={mes}
          tipo={tipo}
          agora={agora}
          catId={catAlvo}
          dmMes={dmMes}
          dmAll={dmAll}
          bomSeSobe={bomSeSobe}
          rotuloTipo={rotuloTipo}
          baseHref={baseHref}
        />
      ) : (
        <>
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-800 p-5 text-white shadow-lg shadow-violet-900/20">
            <div className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-white/10 blur-2xl" />
            <p className="text-sm font-medium text-violet-100">
              {rotuloTipo} {mes === mesAtual ? "este mês (até hoje)" : "no mês"}
            </p>
            <p className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight">
              {formatarEuros(heroAtual)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 font-medium backdrop-blur">
                {heroDif > 0 ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                )}
                {heroPct !== null
                  ? `${heroDif > 0 ? "+" : ""}${heroPct}%`
                  : formatarEuros(heroDif)}{" "}
                vs habitual
              </span>
              <span className="text-violet-100">
                habitual {formatarEuros(heroMedia)}
              </span>
            </div>
            {tipo === "gastos" && resumo.projecao !== null && (
              <p className="mt-3 text-xs text-violet-100">
                Ao ritmo atual: ~{formatarEuros(resumo.projecao)} no fim do mês
              </p>
            )}
          </div>

          {/* Ganhos/poupança (contexto) */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="border-none shadow-sm">
              <CardContent className="flex flex-col gap-1 pt-1">
                <p className="text-[11px] text-muted-foreground">
                  {tipo === "gastos" ? "Ganhos" : "Gastos"}
                </p>
                <p className="text-lg font-bold tabular-nums">
                  {formatarEuros(
                    tipo === "gastos" ? resumo.ganhoAtual : resumo.gastoAtual
                  )}
                </p>
                <Delta
                  dif={tipo === "gastos" ? resumo.ganhoDif : resumo.gastoDif}
                  pct={tipo === "gastos" ? resumo.ganhoPct : resumo.gastoPct}
                  bomSeSobe={tipo === "gastos"}
                />
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="flex flex-col gap-1 pt-1">
                <p className="text-[11px] text-muted-foreground">Poupança</p>
                <p className="text-lg font-bold tabular-nums">
                  {resumo.poupancaAtual === null ? "—" : `${resumo.poupancaAtual}%`}
                </p>
                {resumo.poupancaAtual !== null && resumo.poupancaMedia !== null ? (
                  <Delta
                    dif={resumo.poupancaAtual - resumo.poupancaMedia}
                    pct={null}
                    bomSeSobe
                    unidade="pp"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    habitual{" "}
                    {resumo.poupancaMedia === null ? "—" : `${resumo.poupancaMedia}%`}
                  </span>
                )}
              </CardContent>
            </Card>
          </div>

          <SeccaoCategorias
            txs={txs}
            mes={mes}
            tipo={tipo}
            agora={agora}
            bomSeSobe={bomSeSobe}
            baseHref={baseHref}
          />

          <SeccaoComerciantes
            txs={txs}
            mes={mes}
            tipo={tipo}
            agora={agora}
            bomSeSobe={bomSeSobe}
          />
        </>
      )}
    </div>
  );
}

function SeccaoCategorias({
  txs,
  mes,
  tipo,
  agora,
  bomSeSobe,
  baseHref,
}: {
  txs: TxAnalise[];
  mes: string;
  tipo: TipoAnalise;
  agora: Date;
  bomSeSobe: boolean;
  baseHref: string;
}) {
  const { itens, nBase } = compararCategorias(txs, mes, agora, 3, tipo);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between px-1">
        <p className="text-sm font-semibold">Por categoria</p>
        <p className="text-xs text-muted-foreground">
          vs média de {nBase} {nBase === 1 ? "mês" : "meses"}
        </p>
      </div>
      {itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Sem {tipo} neste mês para comparar.
        </p>
      ) : (
        itens.map((c) => (
          <LinhaComparada
            key={c.chave}
            item={c}
            bomSeSobe={bomSeSobe}
            href={
              c.chave !== "__none__" ? `${baseHref}&cat=${c.chave}` : undefined
            }
          />
        ))
      )}
    </div>
  );
}

function SeccaoComerciantes({
  txs,
  mes,
  tipo,
  agora,
  bomSeSobe,
}: {
  txs: TxAnalise[];
  mes: string;
  tipo: TipoAnalise;
  agora: Date;
  bomSeSobe: boolean;
}) {
  const { itens } = compararComerciantes(txs, mes, agora, 3, tipo);
  const top = [...itens].sort((a, b) => b.atual - a.atual).slice(0, 6);
  if (top.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-sm font-semibold">Onde mais {tipo === "gastos" ? "gastaste" : "recebeste"}</p>
      {top.map((m) => (
        <LinhaComparada
          key={m.chave}
          item={m}
          bomSeSobe={bomSeSobe}
          href={`/comerciante/${encodeURIComponent(m.chave)}`}
        />
      ))}
    </div>
  );
}

function DrillCategoria({
  txs,
  mes,
  tipo,
  agora,
  catId,
  dmMes,
  dmAll,
  bomSeSobe,
  rotuloTipo,
  baseHref,
}: {
  txs: TxAnalise[];
  mes: string;
  tipo: TipoAnalise;
  agora: Date;
  catId: string;
  dmMes: string;
  dmAll: boolean;
  bomSeSobe: boolean;
  rotuloTipo: string;
  baseHref: string;
}) {
  const historico = historicoMensal(txs, mes, tipo, 6, catId);
  const maxMes = Math.max(1, ...historico.map((p) => p.valor));
  const corCat = txs.find((t) => t.categoryId === catId)?.cor ?? "#8b5cf6";
  const drillHref = `${baseHref}&cat=${catId}`;

  // Comerciantes: agregado (todos) ou comparados com o habitual (mês)
  const comerciantes = dmAll
    ? agregarComerciantes(txs, tipo, catId)
    : [...compararComerciantes(txs, dmMes, agora, 3, tipo, catId).itens].sort(
        (a, b) => b.atual - a.atual
      );

  const totalCabecalho = dmAll
    ? historico.reduce((s, p) => s + p.valor, 0)
    : historico.find((p) => p.chave === dmMes)?.valor ?? 0;

  const rotuloMesAtivo = dmAll
    ? "todos os meses"
    : historico.find((p) => p.chave === dmMes)?.rotulo ?? dmMes;

  return (
    <>
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-800 p-5 text-white shadow-lg shadow-violet-900/20">
        <p className="text-sm font-medium capitalize text-violet-100">
          {rotuloTipo} · {rotuloMesAtivo}
        </p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight">
          {formatarEuros(totalCabecalho)}
        </p>
      </div>

      {/* Tendência 6 meses — barras clicáveis */}
      <Card className="border-none shadow-sm">
        <CardContent className="flex flex-col gap-3 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Últimos 6 meses</p>
            <Link
              href={dmAll ? drillHref : `${drillHref}&dm=all`}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                dmAll
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Todos os meses
            </Link>
          </div>
          <p className="-mt-1 text-xs text-muted-foreground">
            Toca num mês para ver os comerciantes desse mês
          </p>
          <div className="flex items-end justify-between gap-1 pt-1">
            {historico.map((p) => {
              const ativo = !dmAll && p.chave === dmMes;
              return (
                <Link
                  key={p.chave}
                  href={`${drillHref}&dm=${p.chave}`}
                  scroll={false}
                  className="flex flex-1 flex-col items-center gap-1.5 rounded-xl py-1 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-24 w-full items-end justify-center">
                    <div
                      className="w-5 rounded-full transition-all"
                      style={{
                        height: `${Math.max(3, (p.valor / maxMes) * 100)}%`,
                        backgroundColor: p.valor > 0 ? corCat : "var(--muted)",
                        opacity: dmAll || ativo || p.valor === 0 ? 1 : 0.4,
                      }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] capitalize",
                      ativo ? "font-bold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {p.rotulo}
                  </span>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Comerciantes do mês escolhido (ou de todos) */}
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 px-1 text-sm font-semibold capitalize">
          <Store className="size-4 text-muted-foreground" /> Comerciantes ·{" "}
          {rotuloMesAtivo}
        </p>
        {comerciantes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            Sem comerciantes identificados{dmAll ? "" : " neste mês"}.
          </p>
        ) : (
          comerciantes.map((m) => (
            <LinhaComparada
              key={m.chave}
              item={m}
              bomSeSobe={bomSeSobe}
              semDelta={dmAll}
              legenda={
                dmAll
                  ? `${m.contagem} ${
                      tipo === "gastos"
                        ? m.contagem === 1
                          ? "compra"
                          : "compras"
                        : m.contagem === 1
                          ? "entrada"
                          : "entradas"
                    }`
                  : undefined
              }
              href={`/comerciante/${encodeURIComponent(m.chave)}`}
            />
          ))
        )}
      </div>
    </>
  );
}
