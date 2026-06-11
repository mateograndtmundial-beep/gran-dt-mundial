import "dotenv/config";
import { sql } from "drizzle-orm";
import { BUDGET, SQUAD } from "../lib/game/config";
import { countryEs } from "../lib/i18n/countries";
import { buildStatsDigest } from "../lib/reports/stats-digest";
import { query, section, kv, pct, nf, table } from "./lib/report";

/**
 * Monitoreo / analytics de Los 11 de Sampa — todo READ-ONLY contra la DB compartida.
 *
 *   npx tsx scripts/stats.ts <seccion> [--slack]
 *   npm run stats -- <seccion> [--slack]
 *
 * Secciones: equipos | engagement | funnel | monetizacion | ligas | salud | all (default)
 *
 * "Equipo actual" de un usuario = su entry_round de mayor round_id (la última fecha
 * que cargó). Tiene sentido hoy: el Mundial arranca 11/06 y casi todo es pre-torneo.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const ULTIMA_FECHA = sql`
  ultima_fecha as (
    select distinct on (er.entry_id)
      er.id as entry_round_id, er.entry_id, er.formation, er.coach_id,
      er.captain_player_id, er.budget_used, er.round_id
    from entry_rounds er
    order by er.entry_id, er.round_id desc
  )
`;

// ──────────────────────────────────────────────────────────────
// Equipos / estrategia
// ──────────────────────────────────────────────────────────────

async function jugadoresMasUsados() {
  const rows = await query<{
    position: string;
    name: string;
    country: string;
    veces_usado: number;
    veces_titular: number;
  }>(sql`
    with ${ULTIMA_FECHA}
    select p.position, p.name, c.name as country,
      count(*) as veces_usado,
      count(*) filter (where erp.is_starter) as veces_titular
    from ultima_fecha uf
    join entry_round_players erp on erp.entry_round_id = uf.entry_round_id
    join players p on p.id = erp.player_id
    join countries c on c.id = p.country_id
    group by p.id, p.position, p.name, c.name
    order by p.position, veces_usado desc
  `);

  section("Jugadores más usados por posición (top 10, equipo actual de cada usuario)");
  let currentPos: string | null = null;
  let rank = 0;
  const top: typeof rows = [];
  for (const r of rows) {
    if (r.position !== currentPos) {
      currentPos = r.position;
      rank = 0;
    }
    rank++;
    if (rank <= 10) top.push({ ...r, country: countryEs(r.country) });
  }
  for (const pos of ["GK", "DEF", "MID", "FWD"]) {
    console.log(`\n  ── ${pos} ──`);
    table(
      top.filter((r) => r.position === pos),
      [
        { key: "name", label: "Jugador", width: 26 },
        { key: "country", label: "Selección", width: 16 },
        { key: "veces_usado", label: "Usado", align: "right" },
        { key: "veces_titular", label: "Titular", align: "right" },
      ],
    );
  }
}

async function capitanesMasElegidos() {
  const rows = await query<{ name: string; country: string; veces: number }>(sql`
    with ${ULTIMA_FECHA}
    select p.name, c.name as country, count(*) as veces
    from ultima_fecha uf
    join players p on p.id = uf.captain_player_id
    join countries c on c.id = p.country_id
    group by p.id, p.name, c.name
    order by veces desc
    limit 10
  `);
  section("Capitanes más elegidos (top 10)");
  table(rows.map((r) => ({ ...r, country: countryEs(r.country) })), [
    { key: "name", label: "Jugador", width: 26 },
    { key: "country", label: "Selección", width: 16 },
    { key: "veces", label: "Veces", align: "right" },
  ]);
}

async function seleccionesMasUsadas() {
  const rows = await query<{ country: string; equipos: number; cupos: number }>(sql`
    with ${ULTIMA_FECHA}
    select c.name as country,
      count(distinct uf.entry_id) as equipos,
      count(*) as cupos
    from ultima_fecha uf
    join entry_round_players erp on erp.entry_round_id = uf.entry_round_id
    join players p on p.id = erp.player_id
    join countries c on c.id = p.country_id
    group by c.id, c.name
    order by cupos desc
    limit 10
  `);
  section("Selecciones más representadas en los planteles (top 10)");
  table(rows.map((r) => ({ ...r, country: countryEs(r.country) })), [
    { key: "country", label: "Selección", width: 18 },
    { key: "equipos", label: "Equipos con ≥1", align: "right", width: 15 },
    { key: "cupos", label: "Cupos totales", align: "right", width: 14 },
  ]);
}

async function formacionesYTecnicos() {
  const formaciones = await query<{ formation: string; veces: number }>(sql`
    with ${ULTIMA_FECHA}
    select formation, count(*) as veces from ultima_fecha group by formation order by veces desc
  `);
  const total = formaciones.reduce((acc, r) => acc + Number(r.veces), 0);

  section("Formaciones más usadas");
  table(formaciones, [
    { key: "formation", label: "Formación", width: 10 },
    { key: "veces", label: "Equipos", align: "right" },
    {
      key: "veces",
      label: "%",
      align: "right",
      format: (v) => pct(Number(v), total),
    },
  ]);

  const tecnicos = await query<{ name: string; country: string; veces: number }>(sql`
    with ${ULTIMA_FECHA}
    select co.name, c.name as country, count(*) as veces
    from ultima_fecha uf
    join coaches co on co.id = uf.coach_id
    join countries c on c.id = co.country_id
    group by co.id, co.name, c.name
    order by veces desc
    limit 10
  `);
  section("Técnicos más usados (top 10)");
  table(tecnicos.map((r) => ({ ...r, country: countryEs(r.country) })), [
    { key: "name", label: "Técnico", width: 26 },
    { key: "country", label: "Selección", width: 16 },
    { key: "veces", label: "Equipos", align: "right" },
  ]);
}

async function distribucionPresupuesto() {
  const rows = await query<{
    promedio: number;
    mediana: number;
    minimo: number;
    maximo: number;
    al_limite: number;
    total: number;
  }>(sql`
    with ${ULTIMA_FECHA}
    select
      avg(budget_used) as promedio,
      percentile_cont(0.5) within group (order by budget_used) as mediana,
      min(budget_used) as minimo,
      max(budget_used) as maximo,
      count(*) filter (where budget_used > ${BUDGET} - 10) as al_limite,
      count(*) as total
    from ultima_fecha
  `);
  const r = rows[0];
  section(`Presupuesto usado (de ${BUDGET})`);
  kv("Promedio", Number(r.promedio).toFixed(1));
  kv("Mediana", Number(r.mediana).toFixed(1));
  kv("Mínimo / Máximo", `${Number(r.minimo).toFixed(1)} / ${Number(r.maximo).toFixed(1)}`);
  kv(`Equipos a <10 del límite (${BUDGET})`, `${r.al_limite} (${pct(Number(r.al_limite), Number(r.total))})`);
}

async function seccionEquipos() {
  await jugadoresMasUsados();
  await capitanesMasElegidos();
  await seleccionesMasUsadas();
  await formacionesYTecnicos();
  await distribucionPresupuesto();
}

// ──────────────────────────────────────────────────────────────
// Engagement
// ──────────────────────────────────────────────────────────────

async function seccionEngagement() {
  const porFecha = await query<{
    round: string;
    order: number;
    status: string;
    equipos: number;
    cambios_totales: number;
    cambios_promedio: number;
    pines_gastados: number;
    con_cambios_extra: number;
  }>(sql`
    select r.name as round, r.sort_order as "order", r.status,
      count(distinct er.entry_id) as equipos,
      coalesce(sum(er.changes_made), 0) as cambios_totales,
      coalesce(avg(er.changes_made), 0) as cambios_promedio,
      coalesce(sum(er.pins_spent), 0) as pines_gastados,
      count(*) filter (where er.pins_spent > 0) as con_cambios_extra
    from rounds r
    left join entry_rounds er on er.round_id = r.id
    group by r.id, r.name, r.sort_order, r.status
    order by r.sort_order
  `);

  section("Actividad por fecha (equipos cargados, cambios y pines gastados)");
  table(porFecha, [
    { key: "round", label: "Fecha", width: 16 },
    { key: "status", label: "Estado", width: 10 },
    { key: "equipos", label: "Equipos", align: "right" },
    { key: "cambios_totales", label: "Cambios", align: "right" },
    {
      key: "cambios_promedio",
      label: "Prom/equipo",
      align: "right",
      width: 11,
      format: (v) => Number(v).toFixed(2),
    },
    { key: "pines_gastados", label: "Pines gastados", align: "right", width: 14 },
    { key: "con_cambios_extra", label: "Pagaron extra", align: "right", width: 13 },
  ]);
}

// ──────────────────────────────────────────────────────────────
// Funnel
// ──────────────────────────────────────────────────────────────

async function seccionFunnel() {
  const rows = await query<{
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
  const r = rows[0];
  const steps = [
    { label: "Usuarios registrados", n: Number(r.total_users) },
    { label: "→ Completaron onboarding (nickname)", n: Number(r.con_username) },
    { label: "→ Armaron equipo (entry)", n: Number(r.con_entry) },
    { label: "→ Cargaron al menos 1 fecha", n: Number(r.con_lineup) },
  ];
  section("Embudo: registro → onboarding → equipo → fecha cargada");
  let prev = steps[0].n;
  for (const [i, s] of steps.entries()) {
    const conv = i === 0 ? "" : `  (${pct(s.n, prev)} del paso anterior · ${pct(s.n, steps[0].n)} del total)`;
    console.log(`  ${s.label.padEnd(40)} ${nf(s.n).padStart(6)}${conv}`);
    prev = s.n;
  }

  const altas = await query<{ dia: string; altas: number }>(sql`
    select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as dia, count(*) as altas
    from users
    group by 1
    order by 1 desc
    limit 14
  `);
  section("Altas de usuarios por día (últimos 14 días con registros)");
  table(altas, [
    { key: "dia", label: "Día", width: 12 },
    { key: "altas", label: "Altas", align: "right" },
  ]);
}

// ──────────────────────────────────────────────────────────────
// Monetización
// ──────────────────────────────────────────────────────────────

async function seccionMonetizacion() {
  const ordenes = await query<{
    provider: string;
    status: string;
    currency: string;
    cantidad: number;
    monto: number;
  }>(sql`
    select provider, status, currency, count(*) as cantidad, coalesce(sum(amount), 0) as monto
    from orders
    group by provider, status, currency
    order by provider, status, currency
  `);
  section("Órdenes por proveedor / estado / moneda");
  table(ordenes, [
    { key: "provider", label: "Proveedor", width: 12 },
    { key: "status", label: "Estado", width: 10 },
    { key: "currency", label: "Moneda", width: 7 },
    { key: "cantidad", label: "Cantidad", align: "right" },
    { key: "monto", label: "Monto", align: "right", width: 14, format: (v) => nf(Number(v)) },
  ]);

  const conv = await query<{ total: number; pagas: number }>(sql`
    select count(*) as total, count(*) filter (where status = 'paid') as pagas from orders
  `);
  if (conv[0].total > 0) {
    kv("Tasa de conversión (paid / total)", `${pct(conv[0].pagas, conv[0].total)} (${conv[0].pagas}/${conv[0].total})`);
  }

  const ingresos = await query<{ currency: string; total: number }>(sql`
    select currency, sum(amount) as total from orders where status = 'paid' group by currency
  `);
  section("Ingresos acreditados (órdenes paid)");
  if (ingresos.length === 0) console.log("  (todavía sin pagos acreditados)");
  for (const r of ingresos) kv(`Total ${r.currency}`, nf(Number(r.total)));

  const ledger = await query<{ reason: string; movimientos: number; delta_total: number }>(sql`
    select reason, count(*) as movimientos, coalesce(sum(delta), 0) as delta_total
    from pin_transactions
    group by reason
    order by reason
  `);
  section("Ledger de pines por motivo");
  table(ledger, [
    { key: "reason", label: "Motivo", width: 12 },
    { key: "movimientos", label: "Movimientos", align: "right", width: 12 },
    { key: "delta_total", label: "Delta total", align: "right", width: 12, format: (v) => nf(Number(v)) },
  ]);

  const saldo = await query<{ saldo: number; premium: number }>(sql`
    select
      (select coalesce(sum(delta), 0) from pin_transactions) as saldo,
      (select count(*) from users where is_premium) as premium
  `);
  kv("Saldo de pines en circulación (suma de deltas)", nf(Number(saldo[0].saldo)));
  kv("Usuarios premium (pack ilimitado)", nf(Number(saldo[0].premium)));
}

// ──────────────────────────────────────────────────────────────
// Ligas
// ──────────────────────────────────────────────────────────────

async function seccionLigas() {
  const top = await query<{ name: string; code: string; is_public: boolean; miembros: number }>(sql`
    select l.name, l.code, l.is_public, count(lm.id) as miembros
    from leagues l
    left join league_members lm on lm.league_id = l.id
    group by l.id, l.name, l.code, l.is_public
    order by miembros desc
    limit 10
  `);
  section("Ligas con más miembros (top 10)");
  table(top, [
    { key: "name", label: "Liga", width: 24 },
    { key: "code", label: "Código", width: 8 },
    { key: "is_public", label: "Pública", width: 7, format: (v) => (v ? "sí" : "no") },
    { key: "miembros", label: "Miembros", align: "right" },
  ]);

  const cobertura = await query<{ total_users: number; en_liga: number; total_ligas: number }>(sql`
    select
      (select count(*) from users) as total_users,
      (select count(distinct user_id) from league_members) as en_liga,
      (select count(*) from leagues) as total_ligas
  `);
  const c = cobertura[0];
  kv("Total de ligas creadas", nf(Number(c.total_ligas)));
  kv("Usuarios en ≥1 liga", `${nf(Number(c.en_liga))} (${pct(Number(c.en_liga), Number(c.total_users))} del total)`);
}

// ──────────────────────────────────────────────────────────────
// Salud / integridad de datos
// ──────────────────────────────────────────────────────────────

async function chequeo(titulo: string, rows: any[], detailKey?: string) {
  const n = rows.length;
  const icon = n === 0 ? "✅" : "⚠️ ";
  console.log(`  ${icon} ${titulo}: ${n}`);
  if (n > 0 && detailKey) {
    const ids = rows.slice(0, 10).map((r) => r[detailKey]);
    console.log(`     primeros: ${ids.join(", ")}${n > 10 ? "…" : ""}`);
  }
}

async function seccionSalud() {
  section("Chequeos de integridad (deberían dar 0)");

  const sinLineup = await query<{ entry_id: number }>(sql`
    select e.id as entry_id from entries e
    left join entry_rounds er on er.entry_id = e.id
    where er.id is null
  `);
  await chequeo("Entries sin ninguna fecha cargada", sinLineup, "entry_id");

  const rosterIncorrecto = await query<{ entry_round_id: number; jugadores: number }>(sql`
    select er.id as entry_round_id, count(erp.id) as jugadores
    from entry_rounds er
    join entry_round_players erp on erp.entry_round_id = er.id
    group by er.id
    having count(erp.id) != ${SQUAD.TOTAL}
  `);
  await chequeo(`Entry-rounds con roster != ${SQUAD.TOTAL} jugadores`, rosterIncorrecto, "entry_round_id");

  const sobrepresupuesto = await query<{ entry_round_id: number; budget_used: number }>(sql`
    select id as entry_round_id, budget_used from entry_rounds where budget_used > ${BUDGET}
  `);
  await chequeo(`Entry-rounds con presupuesto > ${BUDGET}`, sobrepresupuesto, "entry_round_id");

  const sinCapitanOTecnico = await query<{ entry_round_id: number }>(sql`
    select id as entry_round_id from entry_rounds
    where captain_player_id is null or coach_id is null
  `);
  await chequeo("Entry-rounds sin capitán o sin técnico", sinCapitanOTecnico, "entry_round_id");

  const capitanFueraDeRoster = await query<{ entry_round_id: number }>(sql`
    select er.id as entry_round_id
    from entry_rounds er
    where er.captain_player_id is not null
      and not exists (
        select 1 from entry_round_players erp
        where erp.entry_round_id = er.id and erp.player_id = er.captain_player_id
      )
  `);
  await chequeo("Entry-rounds con capitán fuera de su propio roster", capitanFueraDeRoster, "entry_round_id");
}

// ──────────────────────────────────────────────────────────────
// Slack (opcional)
// ──────────────────────────────────────────────────────────────

async function postSlackDigest() {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_STATS;
  if (!token || !channel) {
    console.log("\n⚠️  --slack: falta SLACK_BOT_TOKEN o SLACK_CHANNEL_STATS en el entorno, no se posteó nada.");
    console.log('     Agregá SLACK_CHANNEL_STATS=C0B94N06LLS a tu .env (canal #stats).');
    return;
  }

  const { text, blocks } = await buildStatsDigest();

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ channel, text, blocks }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    console.log(json.ok ? "\n✅ Digest posteado a Slack (#stats)." : `\n❌ Slack error: ${json.error}`);
  } catch (e) {
    console.log(`\n❌ Falló el post a Slack: ${(e as Error).message}`);
  }
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────

const SECTIONS: Record<string, () => Promise<void>> = {
  equipos: seccionEquipos,
  engagement: seccionEngagement,
  funnel: seccionFunnel,
  monetizacion: seccionMonetizacion,
  ligas: seccionLigas,
  salud: seccionSalud,
};

async function main() {
  const args = process.argv.slice(2);
  const wantsSlack = args.includes("--slack");
  const target = args.find((a) => !a.startsWith("--")) ?? "all";

  if (target !== "all" && !SECTIONS[target]) {
    console.error(
      `❌ Sección desconocida: "${target}". Opciones: ${Object.keys(SECTIONS).join(", ")}, all`,
    );
    process.exit(1);
  }

  const toRun = target === "all" ? Object.entries(SECTIONS) : [[target, SECTIONS[target]] as const];
  for (const [name, fn] of toRun) {
    console.log(`\n${"═".repeat(70)}\n  ${name.toUpperCase()}\n${"═".repeat(70)}`);
    await fn();
  }

  if (wantsSlack) await postSlackDigest();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
