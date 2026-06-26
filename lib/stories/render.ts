import sharp from "sharp";
import type { Browser } from "playwright-core";

// Render env-aware del HTML a PNG. En Vercel (Lambda) usa @sparticuz/chromium +
// playwright-core; en local usa el Playwright completo (su chromium ya instalado).
// Imports dinámicos para no cargar el paquete equivocado en cada entorno.
async function launchBrowser(): Promise<Browser> {
  const onVercel = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (onVercel) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const { chromium: pw } = await import("playwright-core");
    return pw.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const { chromium: pw } = await import("playwright");
  return pw.launch();
}

// Navegador compartido por todo el proceso: lanzar Chromium es lo más caro del
// render (segundos en Lambda con @sparticuz/chromium). Antes se lanzaba/cerraba
// UNO por imagen → renderizar todas las stories+carruseles de una fecha reventaba
// el timeout de 300s del cron (se cortaba a mitad y dejaba carruseles sin postear).
// Ahora se lanza una sola vez y cada render solo abre/cierra una página.
// El caller (cron/script) debe llamar closeBrowser() al terminar.
let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await launchBrowser();
  return _browser;
}

/** Cierra el navegador compartido (llamar al final de un cron/script). Idempotente. */
export async function closeBrowser(): Promise<void> {
  if (_browser) {
    try {
      await _browser.close();
    } catch {
      /* ya cerrado / proceso muriendo: no importa */
    }
    _browser = null;
  }
}

export type RenderSize = { width: number; height: number };

// El error "Target page, context or browser has been closed" aparece cuando el
// proceso de Chromium murió mientras el objeto Browser de JS lo sigue creyendo vivo:
// pasa, sobre todo, al REUSAR el navegador compartido entre invocaciones del Lambda
// (Vercel congela/descongela la función y mata el child de chromium; `isConnected()`
// puede quedar en true stale). También por un crash/OOM puntual del render. En esos
// casos relanzamos el navegador y reintentamos UNA vez.
const isDeadBrowserError = (e: unknown): boolean =>
  /target (page|closed)|has been closed|browser has been closed|crash|disconnected|Connection closed|Protocol error/i.test(
    (e as Error)?.message ?? "",
  );

// Tope por operación: que un render nunca cuelgue indefinidamente (p.ej. esperando
// una fuente remota que no llega) y deje el cron sin postear el resto.
const RENDER_TIMEOUT_MS = 25_000;
const FONTS_READY_TIMEOUT_MS = 4_000;

/** Un intento de render contra el navegador compartido. Lanza si la página/navegador muere. */
async function renderOnce(html: string, size: RenderSize): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 2 });
  page.setDefaultTimeout(RENDER_TIMEOUT_MS);
  try {
    // "load" (no "networkidle"): los assets críticos (banderas, logo, íconos, y la
    // tipografía de títulos en el carrusel) van embebidos en base64, así que la página
    // ya está lista al disparar `load`. "networkidle" puede no llegar nunca cuando hay
    // <link> a Google Fonts con preconnect, colgando el render.
    await page.setContent(html, { waitUntil: "load", timeout: RENDER_TIMEOUT_MS });
    // Esperamos a que las fuentes carguen, pero ACOTADO: si una fuente remota tarda o
    // no llega, seguimos igual (cae al fallback sans-serif) en vez de colgarnos.
    await page.evaluate(
      (ms) =>
        Promise.race([
          (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready,
          new Promise((r) => setTimeout(r, ms)),
        ]).then(() => true), // primitivo serializable (no devolver el FontFaceSet)
      FONTS_READY_TIMEOUT_MS,
    );
    const shot = await page.screenshot({ clip: { x: 0, y: 0, width: size.width, height: size.height } });
    return await sharp(shot).resize(size.width, size.height, { kernel: "lanczos3" }).png().toBuffer();
  } finally {
    await page.close().catch(() => {});
  }
}

/** Rasteriza HTML a PNG `size` (render 2× + downscale LANCZOS, SPEC §0). */
export async function renderPng(html: string, size: RenderSize): Promise<Buffer> {
  try {
    return await renderOnce(html, size);
  } catch (e) {
    if (!isDeadBrowserError(e)) throw e;
    // Navegador muerto/stale: descartamos el compartido, relanzamos y reintentamos
    // una vez. Esto auto-sana el caso del browser reusado entre invocaciones del cron
    // y el de un crash puntual a mitad de un lote de renders.
    await closeBrowser();
    return await renderOnce(html, size);
  }
}

/** Rasteriza una story 1080×1920 (SPEC §0). Wrapper de `renderPng` para no romper callers. */
export async function renderStoryPng(html: string): Promise<Buffer> {
  return renderPng(html, { width: 1080, height: 1920 });
}
