// Nombres de las selecciones en español para la UI. La DB guarda los nombres
// en inglés tal como vienen de API-Football (y el matching de precios contra
// Transfermarkt depende de eso), así que NO se traduce en la base: se traduce
// acá, en el borde hacia la UI (lib/queries.ts y reportes).
//
// La clave es `countries.name` EXACTO como está en la DB (48 selecciones del
// Mundial 2026). Si API-Football suma o renombra un equipo y no está en el
// mapa, `countryEs` devuelve el nombre original (se ve en inglés hasta que se
// agregue la traducción — nunca rompe).
export const COUNTRY_NAME_ES: Record<string, string> = {
  Algeria: "Argelia",
  Argentina: "Argentina",
  Australia: "Australia",
  Austria: "Austria",
  Belgium: "Bélgica",
  "Bosnia & Herzegovina": "Bosnia y Herzegovina",
  Brazil: "Brasil",
  Canada: "Canadá",
  "Cape Verde Islands": "Cabo Verde",
  Colombia: "Colombia",
  "Congo DR": "RD Congo",
  Croatia: "Croacia",
  "Curaçao": "Curazao",
  "Czech Republic": "República Checa",
  Ecuador: "Ecuador",
  Egypt: "Egipto",
  England: "Inglaterra",
  France: "Francia",
  Germany: "Alemania",
  Ghana: "Ghana",
  Haiti: "Haití",
  Iran: "Irán",
  Iraq: "Irak",
  "Ivory Coast": "Costa de Marfil",
  Japan: "Japón",
  Jordan: "Jordania",
  Mexico: "México",
  Morocco: "Marruecos",
  Netherlands: "Países Bajos",
  "New Zealand": "Nueva Zelanda",
  Norway: "Noruega",
  Panama: "Panamá",
  Paraguay: "Paraguay",
  Portugal: "Portugal",
  Qatar: "Qatar",
  "Saudi Arabia": "Arabia Saudita",
  Scotland: "Escocia",
  Senegal: "Senegal",
  "South Africa": "Sudáfrica",
  "South Korea": "Corea del Sur",
  Spain: "España",
  Sweden: "Suecia",
  Switzerland: "Suiza",
  Tunisia: "Túnez",
  "Türkiye": "Turquía",
  USA: "Estados Unidos",
  Uruguay: "Uruguay",
  Uzbekistan: "Uzbekistán",
};

/** Traduce un nombre de selección (como está en la DB) al español de la UI. */
export function countryEs(name: string): string;
export function countryEs(name: string | null): string | null;
export function countryEs(name: string | null): string | null {
  if (name == null) return null;
  return COUNTRY_NAME_ES[name] ?? name;
}
