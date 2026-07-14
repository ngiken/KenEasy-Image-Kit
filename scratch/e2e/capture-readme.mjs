import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(HERE, "../..");
const WEB = join(ROOT, "web");
const SHOTS = join(ROOT, "docs", "screenshots");
const TEMP = join(HERE, "out");
mkdirSync(SHOTS, { recursive: true });
mkdirSync(TEMP, { recursive: true });

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
  let relative = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "") || "index.html";
  relative = normalize(relative);
  const target = resolve(WEB, relative);
  if (target !== WEB && !target.startsWith(WEB + sep)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  if (!existsSync(target)) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": types[extname(target).toLowerCase()] || "application/octet-stream" });
  createReadStream(target).pipe(response);
});
await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/`;

function seedPreferences(theme = "light") {
  localStorage.setItem("keneasy-imagekit-lang", "zh");
  localStorage.setItem("keneasy-imagekit-appearance", theme);
  localStorage.removeItem("keneasy-imagekit-settings-v2");
}

async function addDemoImages(page) {
  await page.evaluate(async () => {
    function canvas(width, height, colors, label) {
      const surface = document.createElement("canvas");
      surface.width = width;
      surface.height = height;
      const context = surface.getContext("2d");
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1]);
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      context.fillStyle = "rgba(255,255,255,.22)";
      context.beginPath();
      context.arc(width * .72, height * .25, Math.min(width, height) * .17, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "rgba(10,18,35,.28)";
      context.beginPath();
      context.moveTo(0, height);
      context.lineTo(width * .38, height * .43);
      context.lineTo(width * .62, height * .7);
      context.lineTo(width, height * .35);
      context.lineTo(width, height);
      context.closePath();
      context.fill();
      context.fillStyle = "rgba(255,255,255,.92)";
      context.font = `700 ${Math.max(28, Math.round(width / 18))}px -apple-system, sans-serif`;
      context.fillText(label, width * .07, height * .14);
      return surface;
    }
    function toFile(surface, name, type) {
      return new Promise((resolveFile) => surface.toBlob((blob) => resolveFile(new File([blob], name, { type })), type, .92));
    }
    const specifications = [
      [1200, 800, ["#ff759f", "#8178ff"], "Sunset", "weekend-sunset.jpg", "image/jpeg"],
      [900, 900, ["#66d4ff", "#3478f6"], "Ocean", "blue-ocean.png", "image/png"],
      [1000, 680, ["#55d98a", "#1aa7a1"], "Forest", "green-forest.jpg", "image/jpeg"],
      [800, 1200, ["#ffb24a", "#ff557f"], "Portrait", "warm-portrait.png", "image/png"],
    ];
    const transfer = new DataTransfer();
    for (const [width, height, colors, label, name, type] of specifications) {
      transfer.items.add(await toFile(canvas(width, height, colors, label), name, type));
    }
    const input = document.getElementById("fileInput");
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForFunction(() => document.querySelectorAll("#fileList .file-item").length === 4);
  await page.waitForFunction(() => Array.from(document.querySelectorAll("#fileList .sub")).every((node) => /×/.test(node.textContent)));
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: "zh-CN", colorScheme: "light", acceptDownloads: true });
  await context.addInitScript(seedPreferences, "light");
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(350);

  await page.screenshot({ path: join(SHOTS, "hero-light.png") });
  await page.screenshot({ path: join(TEMP, "readme-tour-01.png") });
  await page.locator(".header").evaluate((element) => { element.style.position = "absolute"; });
  await page.locator(".skip-link").evaluate((element) => { element.style.display = "none"; });

  await addDemoImages(page);
  await page.click('[data-preset-id="smaller"]');
  await page.locator(".workspace-grid").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.locator(".workspace-grid").screenshot({ path: join(SHOTS, "workspace-light.png") });
  await page.screenshot({ path: join(TEMP, "readme-tour-02.png") });

  await page.click("#themeToggle");
  await page.locator(".workspace-grid").scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await page.locator(".workspace-grid").screenshot({ path: join(SHOTS, "workspace-dark.png") });
  await page.click("#themeToggle");
  await page.locator(".workspace-grid").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);

  const download = page.waitForEvent("download");
  await page.click("#btnConvert");
  await download;
  await page.waitForFunction(() => document.getElementById("btnConvert").getAttribute("aria-busy") === "false");
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(TEMP, "readme-tour-03.png") });

  await context.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: "zh-CN", colorScheme: "light" });
  await mobileContext.addInitScript(seedPreferences, "light");
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(url, { waitUntil: "networkidle" });
  await mobilePage.evaluate(() => document.fonts && document.fonts.ready);
  await mobilePage.waitForTimeout(350);
  await mobilePage.screenshot({ path: join(SHOTS, "mobile-light.png") });
  await mobileContext.close();

  console.log("README screenshots captured in docs/screenshots/");
} finally {
  await browser.close();
  server.close();
}
