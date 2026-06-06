import { apiFootball } from "./client";
import { normalizeName } from "../pricing/normalize";

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * Lógica compartida para completar datos de jugadores desde API-Football:
 * nombre, club y año de nacimiento. La usa el seed (scripts/seed.ts) al insertar
 * cada jugador.
 *
 * Por qué hace falta: /players/squads (lo que lista el plantel) trae el nombre
 * abreviado ("T. Courtois") y sin club. El nombre completo + club + nacimiento
 * vienen en /players?id=&season=. Las temporadas de clubes se etiquetan por año
 * de inicio: la 2025-26 es season 2025 (ahí está el club); season 2026 solo tiene
 * el Mundial. Por eso pedimos season 2025 y caemos a 2024 / al perfil.
 */

const CLUB_SEASONS = [2025, 2024];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type PlayerDetails = {
  firstname: string | null;
  lastname: string | null;
  club: string | null;
  birthYear: number | null;
  photo: string | null;
};

function parseBirthYear(date: string | undefined | null): number | null {
  if (!date) return null;
  const y = Number(String(date).slice(0, 4));
  return Number.isFinite(y) && y > 1950 && y < 2020 ? y : null;
}

/** Elige el club: el equipo con más partidos que NO sea la selección (nacionalidad). */
function pickClub(stats: any[], nationality: string | undefined): string | null {
  const apps = new Map<string, number>();
  for (const s of stats ?? []) {
    const team = s?.team?.name;
    if (!team || team === nationality) continue;
    apps.set(team, (apps.get(team) ?? 0) + (Number(s?.games?.appearences) || 0));
  }
  if (apps.size === 0) return null;
  return [...apps.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** ¿El nombre del plantel viene abreviado? ("T. Courtois", "L. Messi") */
export const isAbbreviated = (name: string) => /(^|\s)\p{L}\.(?=\s|$)/u.test(name);
export const firstToken = (s: string) => s.trim().split(/\s+/)[0] ?? "";

/** Apellido tal como lo muestra el plantel: todo lo que sigue a la(s) inicial(es). */
export function squadSurname(squadName: string): string {
  const parts = squadName.trim().split(/\s+/);
  let i = 0;
  while (i < parts.length && /^\p{L}\.?$/u.test(parts[i])) i++;
  return parts.slice(i).join(" ");
}

/**
 * Restaura diacríticos de un token usando el apellido legal acentuado: el
 * plantel suele venir en ASCII ("Modric"), el nombre legal acentuado ("Modrić").
 */
function accentToken(token: string, legalLast: string): string {
  const target = normalizeName(token);
  for (const t of (legalLast ?? "").split(/\s+/)) {
    if (t && normalizeName(t) === target) return t;
  }
  return token;
}

/**
 * Decide el nombre a guardar. Si el nombre del plantel ya es "común" (no
 * abreviado, p.ej. "Marquinhos", "João Cancelo") lo conservamos: es el mejor
 * para mostrar y el que usa Transfermarkt. Si está abreviado, expandimos solo
 * la inicial con el nombre y conservamos EL APELLIDO DEL PLANTEL (el común, no el
 * legal compuesto: "L. Messi" → "Lionel Messi", no "Lionel Messi Cuccittini"),
 * restaurando acentos desde el nombre legal cuando el plantel viene en ASCII.
 */
export function resolveName(
  squadName: string,
  firstname?: string | null,
  lastname?: string | null,
): string {
  const sq = (squadName ?? "").trim();
  if (!sq) {
    return [firstToken(firstname ?? ""), (lastname ?? "").trim()].filter(Boolean).join(" ").trim();
  }
  if (!isAbbreviated(sq)) return sq; // nombre común, conservar
  const first = firstToken(firstname ?? "");
  const surname = squadSurname(sq)
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => accentToken(t, lastname ?? ""))
    .join(" ");
  return [first, surname].filter(Boolean).join(" ").trim() || sq;
}

/** Trae nombre completo + club + año de nacimiento de un jugador. */
export async function getPlayerDetails(apiId: number): Promise<PlayerDetails | null> {
  let player: any = null;
  let club: string | null = null;

  for (const season of CLUB_SEASONS) {
    const resp = (await apiFootball.playerSeason(apiId, season)) as any[];
    const r = resp?.[0];
    if (r?.player) {
      player = player ?? r.player;
      club = club ?? pickClub(r.statistics, r.player?.nationality);
    }
    await sleep(200);
    if (club) break;
  }

  if (!player) {
    const prof = (await apiFootball.playerProfile(apiId)) as any[];
    player = prof?.[0]?.player ?? null;
    await sleep(200);
  }
  if (!player) return null;

  return {
    firstname: player.firstname ?? null,
    lastname: player.lastname ?? null,
    club,
    birthYear: parseBirthYear(player?.birth?.date),
    photo: player.photo ?? null,
  };
}
