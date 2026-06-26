// Pausa / cancelación de la Liga Premium (GOLDEN TICKET).
//
// Mientras COPA_PAUSED sea `true`:
//  - NO se aceptan nuevas inscripciones: `createEntryOrder` corta antes de crear la
//    orden / cobrar (guard server-side, no alcanza con esconder el botón).
//  - Se ocultan todos los CTA/banners de promo de la copa (home, /ligas, /mi-equipo,
//    /copa) para no invitar a sumarse.
//  - A los NO inscriptos que entran a /copa se les muestra `COPA_PAUSED_PROSPECT`.
//  - A los inscriptos se les muestra `COPA_PAUSED_ENROLLED` dentro de la liga
//    (/ligas/[code] y la fila/landing de la copa): cancelación + reembolso + pines.
//
// Para REACTIVAR la copa: poner COPA_PAUSED = false. (El producto de entrada sigue
// `active` en la DB, así que con eso alcanza para volver a tomar inscripciones.)
export const COPA_PAUSED = true;

// Aviso para quien NO está inscripto e intenta sumarse.
export const COPA_PAUSED_PROSPECT = {
  title: "Inscripciones en pausa",
  body:
    "Estamos resolviendo unos temas legales y administrativos de la Liga Premium, así que " +
    "por ahora pausamos las inscripciones. Te avisamos por Instagram apenas se reanude. " +
    "¡Gracias por el aguante!",
} as const;

// Aviso para los inscriptos (dentro de la liga): cancelación + reembolso + pines.
export const COPA_PAUSED_ENROLLED = {
  title: "La Liga Premium no se va a disputar",
  body:
    "Por una cuestión legal no vamos a poder llevar adelante la Liga Premium. Te vamos a " +
    "contactar por mail a la brevedad para devolverte el importe de la entrada y, además, " +
    "sumarte pines de regalo por la molestia. Lamentamos el inconveniente.",
} as const;
