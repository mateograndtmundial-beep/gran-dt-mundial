import { describe, it, expect, beforeAll } from "vitest";
import { pinMovementOps } from "./pins";

// pinMovementOps construye queries de drizzle (no conecta hasta ejecutar). Con una
// DATABASE_URL dummy alcanza para compilar el SQL vía .toSQL() y auditarlo offline.
beforeAll(() => {
  process.env.DATABASE_URL ??= "postgres://u:p@localhost:5432/test";
});

const toSql = (op: unknown) => (op as { toSQL: () => { sql: string } }).toSQL().sql;

describe("pinMovementOps — guard de saldo (regresión: constant-folding de 1/0)", () => {
  it("débito (delta>0): el guard NO usa el literal constante 1/0", () => {
    // Bug crítico: `case ... else 1 / 0 end` con operandos constantes lo evalúa
    // Postgres en tiempo de PLANEACIÓN (constant folding) → lanza división por cero
    // SIEMPRE, aun con saldo suficiente, rompiendo todo gasto de pines. El divisor
    // del else debe derivar del saldo (subconsulta) para no ser pre-evaluado.
    const ops = pinMovementOps(60, 1, 2);
    expect(ops).toHaveLength(2); // [lock SELECT ... FOR UPDATE, INSERT débito]
    const sql = toSql(ops[ops.length - 1]);

    // No debe existir un `1 / 0` constante.
    expect(sql).not.toMatch(/\b1\s*\/\s*0\b/);
    // El guard divide por un cero derivado del saldo (subconsulta sum del ledger).
    expect(sql.toLowerCase()).toContain("coalesce(sum");
    expect(sql).toContain("/");
  });

  it("reembolso (delta<0): acredita sin guard, sin 1/0", () => {
    const ops = pinMovementOps(60, -2, 2);
    expect(ops).toHaveLength(1);
    expect(toSql(ops[0])).not.toMatch(/\b1\s*\/\s*0\b/);
  });
});
