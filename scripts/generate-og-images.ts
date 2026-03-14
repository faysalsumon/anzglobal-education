/**
 * Generates 1200×630 Open Graph banner images for AU and BD domains
 * using Playwright to screenshot styled HTML templates.
 *
 * Run: bun scripts/generate-og-images.ts
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../client/public");

function buildHtml(opts: {
  region: "AU" | "BD";
  title: string;
  subtitle: string;
  domain: string;
  accentColor: string;
  regionLabel: string;
}) {
  const { region, title, subtitle, domain, accentColor, regionLabel } = opts;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&family=Open+Sans:wght@400;500;600&display=swap');
  body {
    width: 1200px;
    height: 630px;
    overflow: hidden;
    font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #0d2144 0%, #1a3a6b 35%, #1e4d8c 65%, #3465A5 100%);
    position: relative;
  }

  /* Geometric accent circles */
  .circle-lg {
    position: absolute;
    border-radius: 50%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .c1 { width: 480px; height: 480px; right: -80px; top: -80px; }
  .c2 { width: 320px; height: 320px; right: 80px; top: 40px; }
  .c3 { width: 160px; height: 160px; right: 220px; top: 180px; }
  .c4 { width: 600px; height: 600px; right: -200px; bottom: -280px; background: rgba(255,255,255,0.025); }

  /* Top accent bar */
  .accent-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 6px;
    background: linear-gradient(90deg, ${accentColor} 0%, rgba(255,255,255,0.6) 60%, transparent 100%);
  }

  /* Content area */
  .content {
    position: absolute;
    left: 72px;
    top: 0; bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 740px;
  }

  /* Logo mark */
  .logo-mark {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 40px;
  }
  .logo-svg {
    width: 52px;
    height: 52px;
    flex-shrink: 0;
  }
  .logo-text {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.65);
  }

  /* Main title */
  .title {
    font-size: 64px;
    font-weight: 900;
    line-height: 1.05;
    color: #ffffff;
    margin-bottom: 20px;
    letter-spacing: -1px;
  }

  /* Subtitle */
  .subtitle {
    font-size: 24px;
    font-weight: 400;
    line-height: 1.5;
    color: rgba(255,255,255,0.78);
    margin-bottom: 44px;
    font-family: 'Open Sans', sans-serif;
  }

  /* Tags row */
  .tags {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 22px;
    border-radius: 30px;
    font-size: 15px;
    font-weight: 600;
    font-family: 'Open Sans', sans-serif;
    letter-spacing: 0.3px;
  }
  .tag-region {
    background: ${accentColor};
    color: #fff;
  }
  .tag-domain {
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.25);
    color: rgba(255,255,255,0.85);
  }

  /* Bottom watermark */
  .watermark {
    position: absolute;
    bottom: 28px;
    right: 48px;
    font-size: 14px;
    color: rgba(255,255,255,0.3);
    letter-spacing: 1px;
    font-family: 'Open Sans', sans-serif;
  }
</style>
</head>
<body>
  <div class="accent-bar"></div>

  <!-- decorative circles -->
  <div class="circle-lg c1"></div>
  <div class="circle-lg c2"></div>
  <div class="circle-lg c3"></div>
  <div class="circle-lg c4"></div>

  <div class="content">
    <!-- Logo mark -->
    <div class="logo-mark">
      <svg class="logo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
        <rect width="160" height="160" rx="28" fill="rgba(255,255,255,0.15)"/>
        <rect x="28" y="28" width="104" height="22" rx="4" fill="#ffffff"/>
        <polygon points="104,28 120,28 120,50 112,44 104,50" fill="rgba(255,255,255,0.35)"/>
        <g transform="rotate(-40, 80, 80)">
          <rect x="36" y="72" width="88" height="18" rx="4" fill="#ffffff"/>
          <polygon points="36,72 36,90 26,81" fill="rgba(255,255,255,0.7)"/>
          <polygon points="124,72 124,90 134,81" fill="rgba(255,255,255,0.7)"/>
        </g>
        <rect x="28" y="110" width="104" height="22" rx="4" fill="#ffffff"/>
      </svg>
      <span class="logo-text">ANZ Global Education</span>
    </div>

    <!-- Main headline -->
    <h1 class="title">${title}</h1>
    <p class="subtitle">${subtitle}</p>

    <!-- Tags -->
    <div class="tags">
      <span class="tag tag-region">${regionLabel}</span>
      <span class="tag tag-domain">${domain}</span>
    </div>
  </div>

  <div class="watermark">anzglobal.${region === "AU" ? "com.au" : "com.bd"}</div>
</body>
</html>`;
}

async function generate() {
  console.log("[OG] Launching browser...");
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1200, height: 630 });

  const configs = [
    {
      region: "AU" as const,
      filename: "og-image.png",
      title: "Study in Australia",
      subtitle: "Connect with top Australian universities.\nFind courses, compare programs, apply online.",
      domain: "anzglobal.com.au",
      accentColor: "#f5a623",
      regionLabel: "Australia",
    },
    {
      region: "BD" as const,
      filename: "og-image-bd.png",
      title: "Study Abroad\nfrom Bangladesh",
      subtitle: "Connect with leading universities worldwide.\nExpert guidance, visa support, scholarships.",
      domain: "anzglobal.com.bd",
      accentColor: "#2eb85c",
      regionLabel: "Bangladesh",
    },
  ];

  for (const cfg of configs) {
    console.log(`[OG] Generating ${cfg.filename}...`);
    const html = buildHtml(cfg);
    await page.setContent(html, { waitUntil: "networkidle" });

    const outPath = path.join(OUT_DIR, cfg.filename);
    await page.screenshot({
      path: outPath,
      type: "png",
      clip: { x: 0, y: 0, width: 1200, height: 630 },
    });
    console.log(`[OG] Saved: ${outPath}`);
  }

  await browser.close();
  console.log("[OG] Done.");
}

generate().catch((err) => {
  console.error("[OG] Error:", err);
  process.exit(1);
});
