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

/** Rasteriza HTML a PNG `size` (render 2× + downscale LANCZOS, SPEC §0). */
export async function renderPng(html: string, size: RenderSize): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 2 });
  try {
    await page.setContent(html, { waitUntil: "networkidle" });
    // Asegura que la fuente (Poppins) ya cargó antes del screenshot.
    await page.evaluate(() => (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready);
    const shot = await page.screenshot({ clip: { x: 0, y: 0, width: size.width, height: size.height } });
    return await sharp(shot).resize(size.width, size.height, { kernel: "lanczos3" }).png().toBuffer();
  } finally {
    await page.close();
  }
}

/** Rasteriza una story 1080×1920 (SPEC §0). Wrapper de `renderPng` para no romper callers. */
export async function renderStoryPng(html: string): Promise<Buffer> {
  return renderPng(html, { width: 1080, height: 1920 });
}
