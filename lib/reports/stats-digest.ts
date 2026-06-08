import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { BUDGET, SQUAD } from "@/lib/game/config";

/**
 * Arma el digest diario de stats (Block Kit de Slack) a partir de queries
 * read-only sobre la DB compartida. Lo consumen:
 * - `scripts/stats.ts --slack` (corrida manual, postea con SLACK_BOT_TOKEN local)
 * - `app/api/cron/stats/route.ts` (Vercel Cron diario, vía lib/notify/slack)
 *
 * NO importa "server-only": este módulo también se ejecuta desde scripts (tsx/Node).
 *
 * "Equipo actual" de un usuario = su entry_round de mayor round_id (la última
 * fecha que cargó). Tiene sentido pre-Mundial, donde casi todo es planificación.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Block = Record<string, unknown>;

const ULTIMA_FECHA = sql`
  ultima_fecha as (
    select distinct on (er.entry_id)
      er.id as entry_round_id, er.entry_id, er.formation, er.coach_id,
      er.captain_player_id, er.budget_used, er.round_id
    from entry_rounds er
    order by er.entry_id, er.round_id desc
  )
`;

async function query<T = Record<string, any>>(chunk: SQL): Promise<T[]> {
  const result = await db.execute(chunk);
  const rows = (result as unknown as { rows?: unknown[] }).rows ?? (result as unknown as unknown[]);
  return rows as T[];
}

function pct(n: number, total: number): string {
  if (total <= 0) return "0.0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

function nf(n: number): string {
  return new Intl.NumberFormat("es-AR").format(n);
}

/** Escapa los 3 caracteres que rompen el mrkdwn de Slack. */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const md = (text: string): Block => ({ type: "section", text: { type: "mrkdwn", text } });
const divider = (): Block => ({ type: "divider" });

export async function buildStatsDigest(): Promise<{ text: string; blocks: Block[] }> {
  // ── Equipos ──
  const [topJugador, topCapitan, topFormacion, topTecnico, topSeleccion, presupuesto] = await Promise.all([
    query<{ position: string; name: string; country: string; veces: number }>(sql`
      with ${ULTIMA_FECHA}, ranked as (
        select p.position, p.name, c.name as country, count(*) as veces,
          row_number() over (partition by p.position order by count(*) desc) as rn
        from ultima_fecha uf
        join entry_round_players erp on erp.entry_round_id = uf.entry_round_id
        join players p on p.id = erp.player_id
        join countries c on c.id = p.country_id
        group by p.id, p.position, p.name, c.name
      )
      select position, name, country, veces from ranked where rn = 1
      order by case position when 'GK' then 1 when 'DEF' then 2 when 'MID' then 3 else 4 end
    `),
    query<{ name: string; country: string; veces: number }>(sql`
      with ${ULTIMA_FECHA}
      select p.name, c.name as country, count(*) as veces
      from ultima_fecha uf join players p on p.id = uf.captain_player_id join countries c on c.id = p.country_id
      group by p.id, p.name, c.name order by veces desc limit 1
    `),
    query<{ formation: string; veces: number; total: number }>(sql`
      with ${ULTIMA_FECHA}
      select formation, count(*) as veces, sum(count(*)) over () as total
      from ultima_fecha group by formation order by veces desc limit 1
    `),
    query<{ name: string; country: string; veces: number }>(sql`
      with ${ULTIMA_FECHA}
      select co.name, c.name as country, count(*) as veces
      from ultima_fecha uf join coaches co on co.id = uf.coach_id join countries c on c.id = co.country_id
      group by co.id, co.name, c.name order by veces desc limit 1
    `),
    query<{ country: string; cupos: number }>(sql`
      with ${ULTIMA_FECHA}
      select c.name as country, count(*) as cupos
      from ultima_fecha uf
      join entry_round_players erp on erp.entry_round_id = uf.entry_round_id
      join players p on p.id = erp.player_id join countries c on c.id = p.country_id
      group by c.id, c.name order by cupos desc limit 1
    `),
    query<{ promedio: number; mediana: number }>(sql`
      with ${ULTIMA_FECHA}
      select avg(budget_used) as promedio, percentile_cont(0.5) within group (order by budget_used) as mediana
      from ultima_fecha
    `),
  ]);

  // ── Engagement (última fecha con equipos cargados) ──
  const engagement = await query<{ round: string; equipos: number; cambios: number; pines: number }>(sql`
    select r.name as round, count(distinct er.entry_id) as equipos,
      coalesce(sum(er.changes_made), 0) as cambios, coalesce(sum(er.pins_spent), 0) as pines
    from entry_rounds er join rounds r on r.id = er.round_id
    group by r.id, r.name, r.sort_order
    order by r.sort_order desc limit 1
  `);

  // ── Funnel ──
  const funnel = await query<{
    total_users: number;
    con_username: number;
    con_entry: number;
    con_lineup: number;
  }>(sql`
    select
      (select count(*) from users) as total_users,
      (select count(*) from users where username is not null) as con_username,
      (select count(*) from entries) as con_entry,
      (select count(distinct entry_id) from entry_rounds) as con_lineup
  `);

  // ── Monetización ──
  const [ingresos, conv, ledger, premium] = await Promise.all([
    query<{ currency: string; total: number }>(sql`
      select currency, sum(amount) as total from orders where status = 'paid' group by currency
    `),
    query<{ total: number; pagas: number }>(sql`
      select count(*) as total, count(*) filter (where status = 'paid') as pagas from orders
    `),
    query<{ saldo: number; comprados: number; gastados: number }>(sql`
      select
        coalesce(sum(delta), 0) as saldo,
        coalesce(sum(delta) filter (where delta > 0), 0) as comprados,
        coalesce(sum(-delta) filter (where delta < 0), 0) as gastados
      from pin_transactions
    `),
    query<{ n: number }>(sql`select count(*) as n from users where is_premium`),
  ]);

  // ── Ligas ──
  const ligas = await query<{ total_ligas: number; en_liga: number }>(sql`
    select (select count(*) from leagues) as total_ligas,
           (select count(distinct user_id) from league_members) as en_liga
  `);

  // ── Salud ──
  const [sinLineup, rosterIncorrecto, sobrepresupuesto, sinCapitanOTecnico, capitanFuera] = await Promise.all([
    query<{ n: number }>(sql`
      select count(*) as n from entries e left join entry_rounds er on er.entry_id = e.id where er.id is null
    `),
    query<{ n: number }>(sql`
      select count(*) as n from (
        select er.id from entry_rounds er join entry_round_players erp on erp.entry_round_id = er.id
        group by er.id having count(erp.id) != ${SQUAD.TOTAL}
      ) x
    `),
    query<{ n: number }>(sql`select count(*) as n from entry_rounds where budget_used > ${BUDGET}`),
    query<{ n: number }>(sql`
      select count(*) as n from entry_rounds where captain_player_id is null or coach_id is null
    `),
    query<{ n: number }>(sql`
      select count(*) as n from entry_rounds er where er.captain_player_id is not null
        and not exists (select 1 from entry_round_players erp where erp.entry_round_id = er.id and erp.player_id = er.captain_player_id)
    `),
  ]);

  const f = funnel[0];
  const ingresosTxt = ingresos.length
    ? ingresos.map((r) => `*${nf(Number(r.total))} ${r.currency}*`).join(" · ")
    : "_sin pagos acreditados todavía_";
  const eng = engagement[0];
  const checks: Array<[string, number]> = [
    ["Entries sin fecha cargada", Number(sinLineup[0].n)],
    [`Roster != ${SQUAD.TOTAL} jugadores`, Number(rosterIncorrecto[0].n)],
    [`Presupuesto > ${BUDGET}`, Number(sobrepresupuesto[0].n)],
    ["Sin capitán o sin técnico", Number(sinCapitanOTecnico[0].n)],
    ["Capitán fuera de su roster", Number(capitanFuera[0].n)],
  ];
  const alertas = checks.filter(([, n]) => n > 0);

  const blocks: Block[] = [
    md(`:bar_chart: *Digest de stats — Los 11 de Sampa*`),
    divider(),
    md(
      `*:soccer: Equipos* _(equipo actual de cada usuario)_\n` +
        topJugador
          .map((r) => `• ${r.position}: *${esc(r.name)}* (${esc(r.country)}) — ${r.veces} equipos`)
          .join("\n") +
        `\n• Capitán más elegido: *${esc(topCapitan[0]?.name ?? "—")}* (${esc(topCapitan[0]?.country ?? "")}) — ${topCapitan[0]?.veces ?? 0} equipos\n` +
        `• Selección más usada: *${esc(topSeleccion[0]?.country ?? "—")}* — ${topSeleccion[0]?.cupos ?? 0} cupos en planteles\n` +
        `• Formación más usada: *${esc(topFormacion[0]?.formation ?? "—")}* (${pct(Number(topFormacion[0]?.veces ?? 0), Number(topFormacion[0]?.total ?? 1))})\n` +
        `• Técnico más usado: *${esc(topTecnico[0]?.name ?? "—")}* (${esc(topTecnico[0]?.country ?? "")}) — ${topTecnico[0]?.veces ?? 0} equipos\n` +
        `• Presupuesto: promedio *${Number(presupuesto[0]?.promedio ?? 0).toFixed(1)}*, mediana *${Number(presupuesto[0]?.mediana ?? 0).toFixed(1)}* (de ${BUDGET})`,
    ),
    divider(),
    md(
      `*:zap: Engagement* _(última fecha con equipos cargados)_\n` +
        (eng
          ? `• ${esc(eng.round)}: *${eng.equipos}* equipos · ${eng.cambios} cambios totales · ${eng.pines} pines gastados`
          : `• _sin fechas cargadas todavía_`),
    ),
    divider(),
    md(
      `*:inbox_tray: Funnel*\n` +
        `• Registrados → onboarding → equipo → fecha cargada\n` +
        `• ${nf(Number(f.total_users))} → ${nf(Number(f.con_username))} (${pct(Number(f.con_username), Number(f.total_users))}) → ${nf(Number(f.con_entry))} (${pct(Number(f.con_entry), Number(f.total_users))}) → ${nf(Number(f.con_lineup))} (${pct(Number(f.con_lineup), Number(f.total_users))})`,
    ),
    divider(),
    md(
      `*:moneybag: Monetización*\n` +
        `• Ingresos acreditados: ${ingresosTxt}\n` +
        `• Conversión de órdenes (paid/total): *${pct(Number(conv[0].pagas), Number(conv[0].total))}* (${conv[0].pagas}/${conv[0].total})\n` +
        `• Pines: *${nf(Number(ledger[0].comprados))}* comprados · *${nf(Number(ledger[0].gastados))}* gastados · saldo en circulación *${nf(Number(ledger[0].saldo))}*\n` +
        `• Usuarios premium: *${nf(Number(premium[0].n))}*`,
    ),
    divider(),
    md(
      `*:trophy: Ligas*\n` +
        `• *${nf(Number(ligas[0].total_ligas))}* ligas creadas · *${nf(Number(ligas[0].en_liga))}* usuarios en alguna (${pct(Number(ligas[0].en_liga), Number(f.total_users))} del total)`,
    ),
    divider(),
    md(
      `*:stethoscope: Salud*\n` +
        (alertas.length === 0
          ? `:white_check_mark: Los 5 chequeos de integridad dan 0 — sin alertas`
          : alertas.map(([label, n]) => `:warning: ${label}: *${n}*`).join("\n")),
    ),
  ];

  return { text: "Digest de stats — Los 11 de Sampa", blocks };
}
