import { describe, it, expect, beforeEach, vi } from "vitest";

// Estado compartido (hoisted): el resultado que devuelve el próximo db.select().
const h = vi.hoisted(() => ({ selectQueue: [] as unknown[] }));

// `unstable_cache` pasa derecho: acá nos interesa la query, no el caché.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const makeSelect = () => {
    const b: Record<string, unknown> = {};
    const self = () => b;
    b.from = self;
    b.where = self;
    b.leftJoin = self;
    b.innerJoin = self;
    b.groupBy = self;
    b.orderBy = self;
    b.limit = self;
    b.offset = self;
    b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(h.selectQueue.shift()).then(res, rej);
    return b;
  };
  return { db: { select: (_cols?: unknown) => makeSelect() } };
});

const { isTournamentFinished } = await import("@/lib/queries");

/**
 * La query cuenta fechas totales y pendientes (status <> 'published'), así que el
 * test scriptea directamente ese agregado — que es exactamente el contrato que nos
 * importa blindar.
 */
function scriptRounds({ total, pending }: { total: number; pending: number }) {
  h.selectQueue = [[{ total, pending }]];
}

describe("isTournamentFinished", () => {
  beforeEach(() => {
    h.selectQueue = [];
  });

  it("es false con la Final EN JUEGO y sin publicar (el caso que rompía el sitio)", async () => {
    // Fechas 1-7 publicadas, la 8 jugándose y todavía sin publicar. Ojo: en este
    // estado `getEditableRound()` YA devuelve null (saltea la fecha porque su
    // kickoff pasó), así que usarla como señal de fin de torneo habría prendido el
    // modo "terminó" —con podio y todo— durante los 90 minutos de la Final.
    scriptRounds({ total: 8, pending: 1 });
    expect(await isTournamentFinished()).toBe(false);
  });

  it("es true recién cuando se publicó la última fecha", async () => {
    scriptRounds({ total: 8, pending: 0 });
    expect(await isTournamentFinished()).toBe(true);
  });

  it("es false a mitad del torneo", async () => {
    scriptRounds({ total: 8, pending: 5 });
    expect(await isTournamentFinished()).toBe(false);
  });

  it("es false sin fechas cargadas (DB recién seedeada, no 'torneo terminado')", async () => {
    scriptRounds({ total: 0, pending: 0 });
    expect(await isTournamentFinished()).toBe(false);
  });

  it("tolera los counts como string (Postgres devuelve bigint como texto)", async () => {
    h.selectQueue = [[{ total: "8", pending: "0" }]];
    expect(await isTournamentFinished()).toBe(true);
  });
});
