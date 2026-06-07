// Reglas del nickname compartidas entre el form (cliente) y las server actions.
// Vive fuera de "use server" porque ese tipo de archivo sólo exporta async fns.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

// Letras, números, guion bajo y punto. Sin espacios: es un handle, no el nombre
// del equipo (ese sigue siendo libre y se elige en /equipo).
const USERNAME_RE = /^[a-zA-Z0-9_.]+$/;

export type UsernameError = "auth" | "format" | "length" | "taken";

/** Valida el formato del nickname. Devuelve null si está OK. */
export function validateUsernameFormat(raw: string): UsernameError | null {
  const v = raw.trim();
  if (v.length < USERNAME_MIN || v.length > USERNAME_MAX) return "length";
  if (!USERNAME_RE.test(v)) return "format";
  return null;
}

export const USERNAME_ERRORS: Record<UsernameError, string> = {
  auth: "Iniciá sesión para elegir tu nombre de DT.",
  format: "Solo letras, números, punto y guion bajo (sin espacios).",
  length: `Entre ${USERNAME_MIN} y ${USERNAME_MAX} caracteres.`,
  taken: "Ese nombre ya está en uso. Probá con otro.",
};
