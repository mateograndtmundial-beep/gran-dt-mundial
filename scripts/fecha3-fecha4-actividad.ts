import "dotenv/config";
import { sql } from "drizzle-orm";
import { countryEs } from "../lib/i18n/countries";
import { query, section, kv, table } from "./lib/report";

/**
 * "Usuarios activos" = entries con equipo cargado en Fecha 3 (última fecha de
 * grupos, ya publicada). De esos, cuántos actualizaron/guardaron para Fecha 4
 * (16vos) y qué selecciones son las más usadas en esos planteles de Fecha 4.
 */

async function main() {
  const rounds = await query<{ id: number; order: number; name: string }>(sql`
    select id, sort_order as "order", name from rounds where sort_order in (3, 4) order by sort_order
  `);
  const r3 = rounds.find((r) => r.order === 3);
  const r4 = rounds.find((r) => r.order === 4);
  if (!r3 || !r4) throw new Error("No encontré Fecha 3 o Fecha 4 en rounds");

  section(`Fecha 3 = "${r3.name}" (id ${r3.id}) · Fecha 4 = "${r4.name}" (id ${r4.id})`);

  const activos = await query<{ n: number }>(sql`
    select count(distinct entry_id) as n from entry_rounds where round_id = ${r3.id}
  `);
  const nActivos = Number(activos[0].n);
  kv("Usuarios activos (con equipo en Fecha 3)", nActivos);

  const actualizaronF4 = await query<{ n: number }>(sql`
    select count(distinct er4.entry_id) as n
    from entry_rounds er4
    join entry_rounds er3 on er3.entry_id = er4.entry_id and er3.round_id = ${r3.id}
    where er4.round_id = ${r4.id}
  `);
  const nF4 = Number(actualizaronF4[0].n);
  kv("De esos, actualizaron su equipo para Fecha 4", `${nF4} (${((nF4 / nActivos) * 100).toFixed(1)}%)`);

  const noActualizaron = nActivos - nF4;
  kv("No actualizaron (siguen con el equipo de Fecha 3)", noActualizaron);

  const selecciones = await query<{ country: string; equipos: number; cupos: number }>(sql`
    select c.name as country,
      count(distinct er4.entry_id) as equipos,
      count(*) as cupos
    from entry_rounds er3
    join entry_rounds er4 on er4.entry_id = er3.entry_id and er4.round_id = ${r4.id}
    join entry_round_players erp on erp.entry_round_id = er4.id
    join players p on p.id = erp.player_id
    join countries c on c.id = p.country_id
    where er3.round_id = ${r3.id}
    group by c.id, c.name
    order by cupos desc
  `);

  section("Selecciones más usadas en los planteles de Fecha 4 (usuarios activos que actualizaron)");
  table(selecciones.map((r) => ({ ...r, country: countryEs(r.country) })), [
    { key: "country", label: "Selección", width: 18 },
    { key: "equipos", label: "Equipos con ≥1", align: "right", width: 15 },
    { key: "cupos", label: "Cupos totales", align: "right", width: 14 },
  ]);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
