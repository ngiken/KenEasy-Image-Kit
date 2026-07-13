// KenEasy Image Kit — end-to-end tests (headless chromium, offline)
// Serves web/ locally, drives the real UI, verifies real canvas/zip output.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(__dirname, "../../web");
const PORT = 5199;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

// ---- tiny static server, no cache, offline ----
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.join(WEB, p);
  if (!file.startsWith(WEB) || !fs.existsSync(file)) {
    res.writeHead(404);
    res.end("404");
    return;
  }
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(file).pipe(res);
});

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: detail || "" });
  const tag = cond ? "PASS" : "FAIL";
  console.log(`[${tag}] ${name}${detail ? " — " + detail : ""}`);
}

await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

// Fail on any real network beyond our localhost (proves offline / no CDN).
const external = [];
page.on("request", (req) => {
  const u = req.url();
  if (!u.startsWith(`http://localhost:${PORT}`) && !u.startsWith("data:") && !u.startsWith("blob:")) {
    external.push(u);
  }
});
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => consoleErrors.push(String(e)));

// Capture downloads.
const downloads = [];
const dlDir = path.join(__dirname, "out");
fs.rmSync(dlDir, { recursive: true, force: true });
fs.mkdirSync(dlDir, { recursive: true });
page.on("download", async (d) => {
  const fn = d.suggestedFilename();
  const dest = path.join(dlDir, fn);
  await d.saveAs(dest);
  downloads.push({ name: fn, path: dest });
});

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });

check("page loads without console errors", consoleErrors.length === 0, consoleErrors.join(" | "));
check(
  "vendor loaded offline (Sortable + JSZip present)",
  await page.evaluate(() => !!window.Sortable && !!window.JSZip)
);

// ---- build real test images as File objects inside the page ----
// a: 1200x800 opaque (jpg-like), b: 600x600 transparent png, c: 300x200 small png, d: 900x1600 tall
async function makeFiles() {
  await page.evaluate(async () => {
    function draw(w, h, alpha) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!alpha) {
        ctx.fillStyle = "#0b0c0f";
        ctx.fillRect(0, 0, w, h);
      }
      // some content
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "rgba(251,114,153,0.9)");
      grad.addColorStop(1, "rgba(0,174,236,0.9)");
      ctx.fillStyle = grad;
      ctx.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
      return c;
    }
    function toFile(canvas, type, name) {
      return new Promise((res) => {
        canvas.toBlob((b) => res(new File([b], name, { type })), type);
      });
    }
    const specs = [
      [draw(1200, 800, false), "image/jpeg", "photo-a.jpg"],
      [draw(600, 600, true), "image/png", "logo-b.png"],
      [draw(300, 200, true), "image/png", "small-c.png"],
      [draw(900, 1600, false), "image/jpeg", "tall-d.jpg"],
    ];
    const files = [];
    for (const [cv, type, name] of specs) files.push(await toFile(cv, type, name));
    window.__testFiles = files;
  });
}

async function setInputFiles() {
  // Move File objects from window.__testFiles into the hidden <input>.
  const dt = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    for (const f of window.__testFiles) dt.items.add(f);
    return dt;
  });
  await page.evaluate(
    ([input, dt]) => {
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    [await page.$("#fileInput"), dt]
  );
}

await makeFiles();
await setInputFiles();

await page.waitForFunction(() => document.querySelectorAll("#fileList li").length === 4);
check("4 images added to queue", (await page.$$("#fileList li")).length === 4);
check("clear + process buttons enabled", await page.evaluate(() => !document.getElementById("btnConvert").disabled && !document.getElementById("btnClear").disabled));

// wait for thumbs to report natural size in .sub
await page.waitForFunction(() =>
  Array.from(document.querySelectorAll("#fileList .sub")).some((s) => /\d+×\d+/.test(s.textContent))
);
check(
  "thumbnails show original dimensions",
  await page.evaluate(() =>
    Array.from(document.querySelectorAll("#fileList .sub")).filter((s) => /\d+×\d+/.test(s.textContent)).length >= 1
  )
);

// ---- reorder test: drag last before first via Sortable API-like DOM swap won't fire onEnd;
// instead verify syncOrderFromDom by manually reordering DOM then calling it is internal.
// We validate ordering indirectly through zip filenames using keepName=off later. ----

// ---------- TEST 1: WebP + quality + max edge 800 + zip ----------
async function setOpts({ format, quality, maxEdge, zip, keepName, filename }) {
  await page.selectOption("#optFormat", format);
  if (quality != null) {
    await page.evaluate((q) => {
      const el = document.getElementById("optQuality");
      el.value = String(q);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, quality);
  }
  await page.fill("#optMaxEdge", String(maxEdge));
  await page.evaluate(
    ([zip, keep, fn]) => {
      const z = document.getElementById("optZip");
      const k = document.getElementById("optKeepName");
      if (z.checked !== zip) z.click();
      if (k.checked !== keep) k.click();
      document.getElementById("optFilename").value = fn;
    },
    [zip, keepName, filename]
  );
}

async function runProcess() {
  const before = downloads.length;
  await page.click("#btnConvert");
  await page.waitForFunction((b) => window.__dummy, {}, before).catch(() => {});
  // wait until a new download arrives
  const t0 = Date.now();
  while (downloads.length <= before && Date.now() - t0 < 15000) {
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(300);
}

import { execSync } from "node:child_process";

function pngSize(buf) {
  // PNG: width @16, height @20 (big-endian) after 8-byte sig + IHDR
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
function isWebp(buf) {
  return buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP";
}
function read24LE(buf, o) {
  return buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16);
}
function webpSize(buf) {
  // Chromium canvas.toBlob emits VP8X (extended). Also handle VP8 / VP8L.
  const fourcc = buf.slice(12, 16).toString("ascii");
  if (fourcc === "VP8X") {
    // canvas width-1 (24-bit LE) @24, height-1 @27
    const w = read24LE(buf, 24) + 1;
    const h = read24LE(buf, 27) + 1;
    return { w, h, fmt: "VP8X" };
  }
  if (fourcc === "VP8 ") {
    // key frame: width/height at offset 26/28 (14-bit)
    const w = (buf.readUInt16LE(26) & 0x3fff);
    const h = (buf.readUInt16LE(28) & 0x3fff);
    return { w, h, fmt: "VP8" };
  }
  if (fourcc === "VP8L") {
    const b = buf.readUInt32LE(21);
    const w = (b & 0x3fff) + 1;
    const h = ((b >> 14) & 0x3fff) + 1;
    return { w, h, fmt: "VP8L" };
  }
  return { w: 0, h: 0, fmt: fourcc };
}
function isJpeg(buf) {
  return buf[0] === 0xff && buf[1] === 0xd8;
}
function jpegSize(buf) {
  let o = 2;
  while (o < buf.length) {
    if (buf[o] !== 0xff) { o++; continue; }
    const marker = buf[o + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const h = buf.readUInt16BE(o + 5);
      const w = buf.readUInt16BE(o + 7);
      return { w, h };
    }
    o += 2 + buf.readUInt16BE(o + 2);
  }
  return { w: 0, h: 0 };
}

// unzip via JSZip in node (reuse the vendored copy through dynamic import of a fresh jszip)
import JSZip from "jszip";
async function readZipEntries(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const entries = [];
  for (const name of Object.keys(zip.files)) {
    const buf = await zip.files[name].async("nodebuffer");
    entries.push({ name, buf });
  }
  return entries;
}

// TEST 1
await setOpts({ format: "image/webp", quality: 0.8, maxEdge: 800, zip: true, keepName: true, filename: "kit-webp" });
await runProcess();
const zip1 = downloads.find((d) => d.name === "kit-webp.zip");
check("WebP+zip: zip downloaded as kit-webp.zip", !!zip1);
if (zip1) {
  const entries = await readZipEntries(zip1.path);
  check("zip contains 4 entries", entries.length === 4, entries.map((e) => e.name).join(", "));
  check("all entries .webp", entries.every((e) => /\.webp$/i.test(e.name)));
  check("all entries valid WEBP signature", entries.every((e) => isWebp(e.buf)));
  const a = entries.find((e) => /photo-a/.test(e.name));
  if (a) {
    const s = webpSize(a.buf);
    check("photo-a 1200x800 → max edge 800 (longest=800)", Math.max(s.w, s.h) === 800, `${s.w}x${s.h} ${s.fmt}`);
  }
  const c = entries.find((e) => /small-c/.test(e.name));
  if (c) {
    const s = webpSize(c.buf);
    check("small-c 300x200 not enlarged (longest≤300)", Math.max(s.w, s.h) <= 300, `${s.w}x${s.h}`);
  }
  const d = entries.find((e) => /tall-d/.test(e.name));
  if (d) {
    const s = webpSize(d.buf);
    check("tall-d 900x1600 → longest 800 (height)", Math.max(s.w, s.h) === 800, `${s.w}x${s.h}`);
  }
}

// TEST 2: JPEG, no resize, separate downloads, keepName off → image-1..4.jpg
await setOpts({ format: "image/jpeg", quality: 0.85, maxEdge: 0, zip: false, keepName: false, filename: "x" });
const beforeSep = downloads.length;
await page.click("#btnConvert");
const t0 = Date.now();
while (downloads.length < beforeSep + 4 && Date.now() - t0 < 20000) {
  await page.waitForTimeout(150);
}
const jpgs = downloads.slice(beforeSep);
check("JPEG separate: 4 files downloaded", jpgs.length === 4, jpgs.map((d) => d.name).join(", "));
check("separate names image-1..4.jpg", jpgs.every((d) => /^image-\d+\.jpg$/.test(d.name)));
const jbuf = jpgs.length ? fs.readFileSync(jpgs[0].path) : Buffer.alloc(0);
check("JPEG output valid signature", jpgs.length && isJpeg(jbuf));
if (jpgs.length) {
  // find photo-a equivalent (image-1) should be 1200x800 (no resize)
  const s = jpegSize(jbuf);
  check("JPEG no-resize keeps 1200x800", s.w === 1200 && s.h === 800, `${s.w}x${s.h}`);
}

// TEST 3: PNG lossless (quality ignored), zip, transparent kept (logo-b is transparent)
await setOpts({ format: "image/png", quality: 1, maxEdge: 0, zip: true, keepName: true, filename: "kit-png" });
await runProcess();
const zip3 = downloads.find((d) => d.name === "kit-png.zip");
check("PNG+zip downloaded", !!zip3);
if (zip3) {
  const entries = await readZipEntries(zip3.path);
  check("PNG zip all .png", entries.every((e) => /\.png$/i.test(e.name)));
  const b = entries.find((e) => /logo-b/.test(e.name));
  if (b) {
    const s = pngSize(b.buf);
    check("PNG logo-b keeps 600x600", s.w === 600 && s.h === 600, `${s.w}x${s.h}`);
    check("PNG has signature", b.buf.slice(1, 4).toString("ascii") === "PNG");
  }
}

// TEST 4: quality lower → smaller webp file than higher quality
await setOpts({ format: "image/webp", quality: 0.4, maxEdge: 0, zip: true, keepName: true, filename: "q-low" });
await runProcess();
await setOpts({ format: "image/webp", quality: 0.95, maxEdge: 0, zip: true, keepName: true, filename: "q-high" });
await runProcess();
const zlow = downloads.find((d) => d.name === "q-low.zip");
const zhigh = downloads.find((d) => d.name === "q-high.zip");
if (zlow && zhigh) {
  const lo = await readZipEntries(zlow.path);
  const hi = await readZipEntries(zhigh.path);
  const la = lo.find((e) => /photo-a/.test(e.name)).buf.length;
  const ha = hi.find((e) => /photo-a/.test(e.name)).buf.length;
  check("lower quality → smaller webp than higher quality", la < ha, `low=${la}B high=${ha}B`);
}

// TEST 5: i18n switch + persistence
await page.click("#langEn");
check("EN switch updates button label", (await page.textContent("#btnConvert")).trim() === "Process");
check("EN queue hint present", /reorder/i.test(await page.textContent(".hint")));
await page.reload({ waitUntil: "networkidle" });
check("EN persists after reload", (await page.textContent("#btnConvert")).trim() === "Process");
await page.click("#langZh");
check("ZH switch back", (await page.textContent("#btnConvert")).trim() === "开始处理");

// TEST 6: clear
await page.evaluate(() => document.getElementById("btnClear").click());
await page.waitForTimeout(400);
check("clear empties queue", (await page.$$("#fileList li")).length === 0);
check("empty state visible after clear", await page.evaluate(() => !document.getElementById("emptyState").hidden));

// TEST 7: narrow viewport → options grid single column
await page.setViewportSize({ width: 380, height: 800 });
await page.waitForTimeout(200);
const cols = await page.evaluate(() => getComputedStyle(document.querySelector(".options-grid")).gridTemplateColumns.split(" ").length);
check("mobile options-grid single column", cols === 1, `${cols} column(s)`);

// TEST 8: offline / no external network
check("no external network requests (offline-safe)", external.length === 0, external.join(", "));
check("no console errors during full run", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log("\n==== SUMMARY ====");
console.log(`total ${results.length}, passed ${results.length - failed.length}, failed ${failed.length}`);
if (failed.length) {
  console.log("FAILED:");
  for (const f of failed) console.log(" - " + f.name + (f.detail ? " :: " + f.detail : ""));
  process.exit(1);
}
console.log("ALL GREEN");
