import sharp from "sharp";

// Render env-aware del HTML a PNG. En Vercel (Lambda) usa @sparticuz/chromium +
// playwright-core; en local usa el Playwright completo (su chromium ya instalado).
// Imports dinámicos para no cargar el paquete equivocado en cada entorno.
async function launchBrowser() {
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

/** Rasteriza HTML a PNG 1080×1920 (render 2× + downscale LANCZOS, SPEC §0). */
export async function renderStoryPng(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle" });
    // Asegura que la fuente (Poppins) ya cargó antes del screenshot.
    await page.evaluate(() => (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready);
    const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    return await sharp(shot).resize(1080, 1920, { kernel: "lanczos3" }).png().toBuffer();
  } finally {
    await browser.close();
  }
}
