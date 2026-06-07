// Lógica de alineación pura (sin React) para poder compartirla entre el cliente
// (FieldBuilder/Pitch) y el server action (saveLineup). La forma de los slots es
// la fuente de verdad de qué compone una alineación válida.
import { FORMATIONS, DEFAULT_FORMATION, SQUAD, type Position } from "@/lib/game/config";

export type Slot = { id: string; position: Position; isStarter: boolean };

// Orden de líneas. Define también el orden de los suplentes (uno por posición).
export const ROWS: Position[] = ["GK", "DEF", "MID", "FWD"];

/**
 * Slots de una formación: 11 titulares con id `${POS}_${n}` (GK_1, DEF_1…) y un
 * suplente por posición con id `SUB_${POS}` (SUB_GK, SUB_DEF…), 4 en total.
 */
export function buildSlots(formation: string): Slot[] {
  const shape = FORMATIONS[formation] ?? FORMATIONS[DEFAULT_FORMATION];
  const slots: Slot[] = [];
  ROWS.forEach((pos) => {
    for (let i = 0; i < shape[pos]; i++)
      slots.push({ id: `${pos}_${i + 1}`, position: pos, isStarter: true });
  });
  ROWS.forEach((pos) => slots.push({ id: `SUB_${pos}`, position: pos, isStarter: false }));
  return slots;
}

/** Posición esperada de un slot a partir de su id ('DEF_2'→DEF, 'SUB_MID'→MID). */
export function positionOfSlot(slotId: string): Position | null {
  const parts = slotId.split("_");
  const pos = parts[0] === "SUB" ? parts[1] : parts[0];
  return (ROWS as string[]).includes(pos ?? "") ? (pos as Position) : null;
}

export type LineupPlayer = { playerId: number; isStarter: boolean; slot: string };

/**
 * Valida que el conjunto de jugadores enviado calce exactamente con los slots de
 * la formación, que cada jugador ocupe un slot de su posición y que el plantel
 * tenga la cantidad correcta. `positionById` trae la posición real desde la DB
 * (no se confía en la del cliente). Devuelve un código de error o null si es válido.
 */
export function validateLineupShape(
  formation: string,
  players: LineupPlayer[],
  positionById: Map<number, Position>,
): null | "invalid_formation" | "invalid_squad_size" | "invalid_formation_composition" {
  if (!FORMATIONS[formation]) return "invalid_formation";

  if (players.length !== SQUAD.TOTAL) return "invalid_squad_size";
  const starters = players.filter((p) => p.isStarter);
  const subs = players.filter((p) => !p.isStarter);
  if (starters.length !== SQUAD.STARTERS || subs.length !== SQUAD.SUBS) {
    return "invalid_squad_size";
  }

  // El set de slots enviado debe ser exactamente el de la formación (sin faltantes,
  // duplicados ni slots inventados).
  const expected = buildSlots(formation);
  const expectedIds = new Set(expected.map((s) => s.id));
  const seen = new Set<string>();
  for (const p of players) {
    if (!expectedIds.has(p.slot) || seen.has(p.slot)) return "invalid_formation_composition";
    seen.add(p.slot);
    // isStarter debe ser coherente con el tipo de slot.
    if (p.isStarter === p.slot.startsWith("SUB_")) return "invalid_formation_composition";
    // La posición real del jugador debe coincidir con la del slot.
    const slotPos = positionOfSlot(p.slot);
    if (!slotPos || positionById.get(p.playerId) !== slotPos) {
      return "invalid_formation_composition";
    }
  }
  if (seen.size !== expectedIds.size) return "invalid_formation_composition";

  return null;
}
