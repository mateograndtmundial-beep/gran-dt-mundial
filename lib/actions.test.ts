import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

// ── Mocks de infraestructura ────────────────────────────────────────────────
// Estado compartido (hoisted) que el mock de @/lib/db va llenando con cada
// operación, para poder auditar DESDE el test qué se escribió y en qué orden.
const h = vi.hoisted(() => ({
  selectQueue: [] as unknown[], // resultados de cada db.select(), en orden de llamada
  inserts: [] as Array<{ table: unknown; values: Record<string, unknown> }>,
  updates: [] as Array<{ table: unknown; values: Record<string, unknown> }>,
  deletes: [] as Array<{ table: unknown }>,
  lastBatch: null as unknown,
  batchThrows: false, // simula el guard 1/0 (saldo insuficiente) abortando el batch
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/queries", () => ({ getEditableRound: vi.fn(), isEnrolledInGoldenTicket: vi.fn() }));

vi.mock("@/lib/pins", () => ({
  getPinBalance: vi.fn(),
  // Una op-placeholder cualquiera: lo único que importa es que vaya DENTRO del batch.
  pinMovementOps: vi.fn(() => [{ __op: "debit" }]),
  // Réplica de la real: detecta el error de saldo insuficiente (division by zero).
  isInsufficientPinsError: (e: unknown) =>
    e instanceof Error && e.message.toLowerCase().includes("division by zero"),
}));

vi.mock("@/lib/db", () => {
  const makeSelect = () => {
    const b: Record<string, unknown> = {};
    const self = () => b;
    b.from = self;
    b.where = self;
    b.innerJoin = self;
    b.orderBy = self;
    b.limit = self;
    // Thenable: al await-earlo, devuelve el próximo resultado scripteado.
    b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(h.selectQueue.shift()).then(res, rej);
    return b;
  };
  const db = {
    select: (_cols?: unknown) => makeSelect(),
    insert: (table: unknown) => ({
      values(v: Record<string, unknown>) {
        h.inserts.push({ table, values: v });
        return {
          // `__insert` etiqueta el op para poder localizarlo DENTRO del batch
          // (los inserts que van al batch no se consumen con .returning()).
          __insert: table,
          // El insert "ensure row" del primer guardado usa .returning({ id }).
          returning: (_x?: unknown) => Promise.resolve([{ id: 555 }]),
          then: (res: (v: unknown) => unknown) => Promise.resolve(undefined).then(res),
        };
      },
    }),
    update: (table: unknown) => ({
      set(v: Record<string, unknown>) {
        h.updates.push({ table, values: v });
        return { where: (_w: unknown) => ({ __op: "update", table, values: v }) };
      },
    }),
    delete: (table: unknown) => ({
      where: (_w: unknown) => {
        h.deletes.push({ table });
        return { __op: "delete", table };
      },
    }),
    batch: async (ops: unknown) => {
      h.lastBatch = ops;
      if (h.batchThrows) throw new Error("NeonDbError: division by zero");
      return [];
    },
  };
  return { db };
});

// Importa DESPUÉS de los mocks.
import { saveLineup } from "./actions";
import { entryRounds, lineupChangeLog } from "./db/schema";
import { getCurrentUser } from "./auth";
import { getEditableRound } from "./queries";
import { getPinBalance } from "./pins";
import type { SaveLineupInput } from "./validation/lineup";

// ── Datos de prueba: una alineación 4-4-2 válida (11 + 4), ids 1..15 ─────────
// Posiciones por id, alineadas con los slots de la formación.
const POS: Record<number, "GK" | "DEF" | "MID" | "FWD"> = {
  1: "GK",
  2: "DEF", 3: "DEF", 4: "DEF", 5: "DEF",
  6: "MID", 7: "MID", 8: "MID", 9: "MID",
  10: "FWD", 11: "FWD",
  12: "GK", 13: "DEF", 14: "MID", 15: "FWD", // suplentes
};
const VALID_INPUT: SaveLineupInput = {
  teamName: "FACUPIZZAS",
  formation: "4-4-2",
  captainPlayerId: 1,
  coachId: null,
  players: [
    { playerId: 1, isStarter: true, slot: "GK_1" },
    { playerId: 2, isStarter: true, slot: "DEF_1" },
    { playerId: 3, isStarter: true, slot: "DEF_2" },
    { playerId: 4, isStarter: true, slot: "DEF_3" },
    { playerId: 5, isStarter: true, slot: "DEF_4" },
    { playerId: 6, isStarter: true, slot: "MID_1" },
    { playerId: 7, isStarter: true, slot: "MID_2" },
    { playerId: 8, isStarter: true, slot: "MID_3" },
    { playerId: 9, isStarter: true, slot: "MID_4" },
    { playerId: 10, isStarter: true, slot: "FWD_1" },
    { playerId: 11, isStarter: true, slot: "FWD_2" },
    { playerId: 12, isStarter: false, slot: "SUB_GK" },
    { playerId: 13, isStarter: false, slot: "SUB_DEF" },
    { playerId: 14, isStarter: false, slot: "SUB_MID" },
    { playerId: 15, isStarter: false, slot: "SUB_FWD" },
  ],
};

// Filas que devuelve el SELECT de players (precio bajo y país único: pasan presupuesto y tope).
const PLAYER_ROWS = VALID_INPUT.players.map((p) => ({
  id: p.playerId,
  price: 10,
  countryId: p.playerId, // país distinto por jugador → nunca supera MAX_PER_COUNTRY
  position: POS[p.playerId],
}));

// Baseline (fecha previa) que difiere en 2 jugadores → 2 cambios = 1 gratis + 1 pin.
const BASELINE_DIFF_2 = [...Array(13)].map((_, i) => ({ playerId: i + 1 })).concat([
  { playerId: 900 },
  { playerId: 901 },
]);

beforeEach(() => {
  h.selectQueue = [];
  h.inserts = [];
  h.updates = [];
  h.deletes = [];
  h.lastBatch = null;
  h.batchThrows = false;
  (getCurrentUser as Mock).mockResolvedValue({ id: 42, isPremium: false });
  (getEditableRound as Mock).mockResolvedValue({ round: { id: 2, order: 5, type: "group" } });
  // Pre-check de saldo pasa (>= delta). El batch decide si el débito alcanza.
  (getPinBalance as Mock).mockResolvedValue(1);
});

const entryRow = { id: 7, userId: 42, name: "FACUPIZZAS" };

describe("saveLineup — atomicidad de pines (regresión Bug B)", () => {
  it("primer guardado: el entryRound se crea SIN pinsSpent>0; el cobro vive solo en el batch", async () => {
    // selects, en orden: players, entry, er0 (vacío = primer guardado), prevEr, baseline
    h.selectQueue = [PLAYER_ROWS, [entryRow], [], [{ id: 99 }], BASELINE_DIFF_2];
    h.batchThrows = true; // el débito falla (saldo cae entre el pre-check y el batch)

    const res = await saveLineup(VALID_INPUT);

    // El usuario recibe el error de pines…
    expect(res).toMatchObject({ ok: false, error: "pins" });

    // …pero la fila del entryRound (commiteada FUERA del batch) NUNCA quedó con un
    // cobro fantasma: se creó con los defaults, sin pinsSpent ni changesMade.
    const erInsert = h.inserts.find((i) => i.table === entryRounds);
    expect(erInsert).toBeTruthy();
    expect(erInsert!.values.pinsSpent).toBeUndefined();
    expect(erInsert!.values.changesMade).toBeUndefined();

    // El valor real (1 pin, 2 cambios) solo se escribe en el UPDATE que va en el batch
    // atómico (el que se revierte junto con el débito que falló).
    const erUpdate = h.updates.find((u) => u.table === entryRounds);
    expect(erUpdate).toBeTruthy();
    expect(erUpdate!.values.pinsSpent).toBe(1);
    expect(erUpdate!.values.changesMade).toBe(2);
  });

  it("primer guardado OK: persiste pinsSpent=1 y devuelve ok", async () => {
    h.selectQueue = [PLAYER_ROWS, [entryRow], [], [{ id: 99 }], BASELINE_DIFF_2];
    h.batchThrows = false;

    const res = await saveLineup(VALID_INPUT);

    expect(res).toMatchObject({ ok: true, totalChanges: 2, pinsSpent: 1 });
    // El insert "ensure row" sigue sin cobro; el cobro va en el batch (que esta vez commitea).
    const erInsert = h.inserts.find((i) => i.table === entryRounds);
    expect(erInsert!.values.pinsSpent).toBeUndefined();
    const erUpdate = h.updates.find((u) => u.table === entryRounds);
    expect(erUpdate!.values.pinsSpent).toBe(1);
  });

  it("re-edición: no inserta entryRound nuevo; el cobro va en el mismo batch atómico", async () => {
    // er0 ya existe (1 cambio confirmado, 0 pines). prevEr existe. baseline = el equipo confirmado.
    const er0 = { id: 77, entryId: 7, roundId: 2, name: "FACUPIZZAS", pinsSpent: 0, changesMade: 1 };
    const baseDiff1 = [...Array(14)].map((_, i) => ({ playerId: i + 1 })).concat([{ playerId: 902 }]);
    h.selectQueue = [PLAYER_ROWS, [entryRow], [er0], [{ id: 99 }], baseDiff1];
    h.batchThrows = false;

    const res = await saveLineup(VALID_INPUT);

    expect(res).toMatchObject({ ok: true });
    // No se creó ninguna fila de entryRounds (se reusa la existente).
    expect(h.inserts.find((i) => i.table === entryRounds)).toBeUndefined();
    // El cobro acumulado (1 gratis + 1 pin) va en el UPDATE batcheado.
    const erUpdate = h.updates.find((u) => u.table === entryRounds);
    expect(erUpdate!.values.pinsSpent).toBe(1);
    expect(erUpdate!.values.changesMade).toBe(2);
  });

  it("el roster (entryRoundPlayers) y el débito comparten el batch atómico", async () => {
    h.selectQueue = [PLAYER_ROWS, [entryRow], [], [{ id: 99 }], BASELINE_DIFF_2];
    h.batchThrows = false;

    await saveLineup(VALID_INPUT);

    // El batch debe contener: update entryRound + delete players + insert players + débito.
    const ops = h.lastBatch as Array<Record<string, unknown>>;
    expect(Array.isArray(ops)).toBe(true);
    expect(ops.some((o) => o.__op === "debit")).toBe(true);
    expect(ops.some((o) => o.__op === "update")).toBe(true);
    expect(ops.some((o) => o.__op === "delete")).toBe(true);
  });
});

describe("saveLineup — log de cambios (auditoría)", () => {
  it("registra el diff correcto (in/out) y va DENTRO del batch atómico", async () => {
    // baseline difiere en 2: ids 1..13 + 900,901. La alineación nueva es 1..15
    // → entran 14 y 15, salen 900 y 901. 2 cambios = 1 gratis + 1 pin.
    h.selectQueue = [PLAYER_ROWS, [entryRow], [], [{ id: 99 }], BASELINE_DIFF_2];
    h.batchThrows = false;

    const res = await saveLineup(VALID_INPUT);
    expect(res).toMatchObject({ ok: true });

    const logInsert = h.inserts.find((i) => i.table === lineupChangeLog);
    expect(logInsert).toBeTruthy();
    expect(logInsert!.values).toMatchObject({
      entryId: 7,
      roundId: 2,
      entryRoundId: 555, // id que devolvió el insert "ensure row"
      playersIn: [14, 15],
      playersOut: [900, 901],
      formation: "4-4-2",
      captainPlayerId: 1,
      pinsDelta: 1,
      changesInSave: 2,
    });

    // CLAVE: el insert del log está en el MISMO batch (atómico) que el resto.
    const ops = h.lastBatch as Array<Record<string, unknown>>;
    expect(ops.some((o) => o.__insert === lineupChangeLog)).toBe(true);
  });

  it("si el batch se revierte por saldo, el log va dentro del batch (se revierte con él)", async () => {
    h.selectQueue = [PLAYER_ROWS, [entryRow], [], [{ id: 99 }], BASELINE_DIFF_2];
    h.batchThrows = true; // el débito aborta el batch

    const res = await saveLineup(VALID_INPUT);
    expect(res).toMatchObject({ ok: false, error: "pins" });

    // El op del log estaba en el batch que se abortó → en la DB real NO persiste.
    const ops = h.lastBatch as Array<Record<string, unknown>>;
    expect(ops.some((o) => o.__insert === lineupChangeLog)).toBe(true);
  });

  it("armado inicial (sin fecha previa): entran los 15, no sale nadie, 0 cambios/0 pines", async () => {
    // er0 vacío y prevEr vacío → no hay baseline → diff = todos entran.
    h.selectQueue = [PLAYER_ROWS, [entryRow], [], []];
    h.batchThrows = false;

    const res = await saveLineup(VALID_INPUT);
    expect(res).toMatchObject({ ok: true });

    const logInsert = h.inserts.find((i) => i.table === lineupChangeLog);
    expect(logInsert!.values).toMatchObject({
      playersIn: VALID_INPUT.players.map((p) => p.playerId),
      playersOut: [],
      pinsDelta: 0,
      changesInSave: 0,
    });
  });

  it("re-edición: el diff es vs el equipo confirmado de la fecha", async () => {
    // er0 ya existe; baseline = roster confirmado (1..14 + 902). Nueva = 1..15
    // → entra 15, sale 902. 1 cambio nuevo (gratis, ya había 1 prior → total 2, 1 pin).
    const er0 = { id: 77, entryId: 7, roundId: 2, name: "FACUPIZZAS", pinsSpent: 0, changesMade: 1 };
    const baseDiff1 = [...Array(14)].map((_, i) => ({ playerId: i + 1 })).concat([{ playerId: 902 }]);
    h.selectQueue = [PLAYER_ROWS, [entryRow], [er0], [{ id: 99 }], baseDiff1];
    h.batchThrows = false;

    await saveLineup(VALID_INPUT);

    const logInsert = h.inserts.find((i) => i.table === lineupChangeLog);
    expect(logInsert!.values).toMatchObject({
      entryRoundId: 77, // reusa el er existente, no crea uno nuevo
      playersIn: [15],
      playersOut: [902],
      changesInSave: 1,
    });
  });
});
