import { z } from "zod";
import { FORMATIONS } from "@/lib/game/config";

const TEAM_NAME_MAX = 40;

// Validación de forma del payload de saveLineup. La validación de negocio
// (presupuesto, composición real por posición, tope por país) vive en el server
// action porque necesita datos de la DB.
export const saveLineupSchema = z.object({
  teamName: z.string().trim().min(1, "name").max(TEAM_NAME_MAX),
  formation: z.string().refine((f) => f in FORMATIONS, { message: "invalid_formation" }),
  captainPlayerId: z.number().int().positive().nullable(),
  coachId: z.number().int().positive().nullable(),
  players: z
    .array(
      z.object({
        playerId: z.number().int().positive(),
        isStarter: z.boolean(),
        slot: z
          .string()
          .regex(/^(GK|DEF|MID|FWD)_\d+$|^SUB_(GK|DEF|MID|FWD)$/, "invalid_slot"),
      }),
    )
    .min(1)
    .max(15)
    // Sin playerId ni slot duplicados.
    .refine((ps) => new Set(ps.map((p) => p.playerId)).size === ps.length, {
      message: "duplicate_player",
    })
    .refine((ps) => new Set(ps.map((p) => p.slot)).size === ps.length, {
      message: "duplicate_slot",
    }),
});

export type SaveLineupInput = z.infer<typeof saveLineupSchema>;

export const TEAM_NAME_MAX_LEN = TEAM_NAME_MAX;
