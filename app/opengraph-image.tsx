import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagen de preview (Open Graph) — la que muestra WhatsApp/redes al compartir el link.
 * Carga las fuentes reales de la marca (Bebas Neue display + Manrope body) y el logo.
 * Todo con try/catch: si algo de red/FS falla en el build, cae a la fuente por defecto
 * en vez de romper la generación.
 */
async function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`;
    // User-Agent viejo → Google sirve TTF (Satori no soporta woff2).
    const css = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1)" } })).text();
    const src = css.match(/src:\s*url\((https:[^)]+)\)\s*format\('(?:truetype|opentype)'\)/)?.[1]
      ?? css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
    if (!src) return null;
    const res = await fetch(src);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image() {
  const [logo, bebas, manrope, manropeBold] = await Promise.all([
    readFile(join(process.cwd(), "public/images/logo/logo-badge-512.png"))
      .then((b) => `data:image/png;base64,${b.toString("base64")}`)
      .catch(() => null),
    loadGoogleFont("Bebas Neue", 400),
    loadGoogleFont("Manrope", 600),
    loadGoogleFont("Manrope", 800),
  ]);

  const fonts: { name: string; data: ArrayBuffer; style: "normal"; weight: 400 | 600 | 800 }[] = [];
  if (bebas) fonts.push({ name: "Bebas Neue", data: bebas, style: "normal", weight: 400 });
  if (manrope) fonts.push({ name: "Manrope", data: manrope, style: "normal", weight: 600 });
  if (manropeBold) fonts.push({ name: "Manrope", data: manropeBold, style: "normal", weight: 800 });

  const display = bebas ? "Bebas Neue" : "sans-serif";
  const body = manrope ? "Manrope" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#F0F2F0",
        }}
      >
        {/* Acento dorado superior */}
        <div style={{ display: "flex", height: 16, background: "#C8A24B" }} />

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: logo ? "flex-start" : "center",
            gap: 56,
            padding: "0 90px",
          }}
        >
          {logo ? (
            <img
              src={logo}
              alt=""
              width={236}
              height={236}
              style={{ borderRadius: 28, boxShadow: "0 10px 0 rgba(15,45,128,0.18)" }}
            />
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: logo ? 640 : 940 }}>
            <div
              style={{
                display: "flex",
                fontFamily: body,
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 7,
                color: "#C8A24B",
                textTransform: "uppercase",
              }}
            >
              Mundial 2026 · Fantasy
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: display,
                fontSize: bebas ? 132 : 92,
                fontWeight: bebas ? 400 : 800,
                lineHeight: 0.92,
                letterSpacing: bebas ? 1 : 0,
                color: "#15181C",
              }}
            >
              Los 11 de Sampa
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: body,
                fontSize: 32,
                fontWeight: 600,
                lineHeight: 1.25,
                color: "#3A4048",
              }}
            >
              Armá tu equipo del Mundial 2026 y ganale a tus amigos.
            </div>
          </div>
        </div>

        {/* Pie azul con el dominio */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 72,
            background: "#1B4FD8",
            color: "#FFFFFF",
            fontFamily: body,
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: 5,
            textTransform: "uppercase",
          }}
        >
          los11desampa.com
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
