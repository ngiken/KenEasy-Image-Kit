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
check(
  "layered core modules loaded (config + i18n + engine)",
  await page.evaluate(() => !!window.KenEasyImageKitConfig && !!window.KenEasyImageKitI18n && !!window.KenEasyImageEngine)
);
check("four data-driven presets rendered", (await page.$$("#presetList .preset-btn")).length === 4);
check("workflow starts at import", await page.evaluate(() => {
  const current = document.querySelector('#workflowSteps [aria-current="step"]');
  return current && current.dataset.workflowStep === "1";
}));

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
check("workflow advances and import surface compacts", await page.evaluate(() => {
  const steps = document.querySelectorAll("#workflowSteps [data-workflow-step]");
  return steps[0].classList.contains("complete") &&
    steps[1].classList.contains("active") &&
    steps[1].getAttribute("aria-current") === "step" &&
    document.getElementById("dropzone").classList.contains("has-files");
}));

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

check("queue summary shows count and total bytes", await page.evaluate(() => /4/.test(document.getElementById("fileCount").textContent) && !/0 B/.test(document.getElementById("totalSize").textContent)));

// Keyboard-accessible ordering: move the first item down, then restore it.
await page.focus("#fileList li:first-child .handle");
await page.keyboard.press("ArrowDown");
check("keyboard ArrowDown reorders queue", /logo-b/.test(await page.textContent("#fileList li:first-child .name")));
await page.keyboard.press("ArrowUp");
check("keyboard ArrowUp restores queue order", /photo-a/.test(await page.textContent("#fileList li:first-child .name")));

// Data-driven preset and conditional option behavior.
await page.click('[data-preset-id="smaller"]');
check("smaller preset applies format, quality, and edge", await page.evaluate(() =>
  document.getElementById("optFormat").value === "image/webp" &&
  document.getElementById("optQuality").value === "0.7" &&
  document.getElementById("optMaxEdge").value === "1920"
));
await page.selectOption("#optFormat", "image/png");
check("PNG disables the quality control", await page.evaluate(() => document.getElementById("optQuality").disabled));
await page.evaluate(() => document.getElementById("optZip").click());
check("separate download disables ZIP filename", await page.evaluate(() => document.getElementById("optFilename").disabled));
await page.evaluate(() => document.getElementById("optZip").click());
check("original-format rules are explicit for GIF/BMP", await page.evaluate(() => {
  const engine = window.KenEasyImageEngine.create(window.KenEasyImageKitConfig);
  const item = { name: "motion.gif", file: new File(["gif"], "motion.gif", { type: "image/gif" }) };
  return engine.outputPlan(item, { format: "original", maxEdge: 0 }).mode === "passthrough" &&
    engine.outputPlan(item, { format: "original", maxEdge: 800 }).type === "image/png";
}));

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
      const name = document.getElementById("optFilename");
      name.value = fn;
      name.dispatchEvent(new Event("input", { bubbles: true }));
    },
    [zip, keepName, filename]
  );
}

async function runProcess() {
  const before = downloads.length;
  await page.click("#btnConvert");
  const busyFeedback = await page.evaluate(() => ({
    ariaBusy: document.getElementById("btnConvert").getAttribute("aria-busy"),
    busyClass: document.getElementById("btnConvert").classList.contains("is-busy"),
    label: document.getElementById("btnConvertLabel").textContent,
  }));
  // wait until a new download arrives (no artificial timeout)
  const t0 = Date.now();
  while (downloads.length <= before && Date.now() - t0 < 15000) {
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(300);
  return busyFeedback;
}

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
const firstBusyFeedback = await runProcess();
check("primary action exposes busy feedback", firstBusyFeedback.ariaBusy === "true" && firstBusyFeedback.busyClass && /Processing|正在处理/.test(firstBusyFeedback.label));
check("workflow completes after download", await page.evaluate(() =>
  document.querySelectorAll("#workflowSteps .complete").length === 3 &&
  !document.querySelector('#workflowSteps [aria-current="step"]')
));
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

// TEST 5: rapid removal must resolve by stable item id, not stale indexes.
const removeButtons = await page.$$("#fileList .icon-btn");
await removeButtons[0].click();
await removeButtons[1].click();
await page.waitForTimeout(400);
check("rapid removal deletes the intended two items", await page.evaluate(() => {
  const names = Array.from(document.querySelectorAll("#fileList .name")).map((el) => el.textContent);
  return names.length === 2 && names.includes("small-c.png") && names.includes("tall-d.jpg");
}));

// TEST 6: i18n + settings persistence.
await setOpts({ format: "image/png", quality: 1, maxEdge: 640, zip: false, keepName: false, filename: "persisted-name" });
await page.waitForTimeout(250);
await page.click("#langEn");
check("EN switch updates button label", (await page.textContent('[data-i18n="btnConvert"]')).trim() === "Process images");
check("EN queue hint present", /reorder/i.test(await page.textContent(".hint")));
await page.reload({ waitUntil: "networkidle" });
check("EN persists after reload", (await page.textContent('[data-i18n="btnConvert"]')).trim() === "Process images");
const themeBefore = await page.getAttribute("html", "data-theme");
await page.click("#themeToggle");
const themeAfter = await page.getAttribute("html", "data-theme");
check("appearance toggle switches light/dark theme", themeAfter && themeAfter !== themeBefore, `${themeBefore} → ${themeAfter}`);
await page.reload({ waitUntil: "networkidle" });
check("appearance preference persists after reload", await page.getAttribute("html", "data-theme") === themeAfter);
check("output settings persist after reload", await page.evaluate(() =>
  document.getElementById("optFormat").value === "image/png" &&
  document.getElementById("optMaxEdge").value === "640" &&
  !document.getElementById("optZip").checked &&
  !document.getElementById("optKeepName").checked
));
await page.click("#langZh");
const zhLabel = (await page.textContent('[data-i18n="btnConvert"]')).trim();
check("ZH switch back", zhLabel === "\u5f00\u59cb\u5904\u7406", zhLabel);

// TEST 7: clear
await page.evaluate(() => document.getElementById("btnClear").click());
await page.waitForTimeout(400);
check("clear empties queue", (await page.$$("#fileList li")).length === 0);
check("empty state visible after clear", await page.evaluate(() => !document.getElementById("emptyState").hidden));

// TEST 8: narrow viewport ? workspace is one column with no horizontal overflow.
await page.setViewportSize({ width: 380, height: 800 });
await page.waitForTimeout(200);
const mobileLayout = await page.evaluate(() => ({
  columns: getComputedStyle(document.querySelector(".workspace-grid")).gridTemplateColumns.split(" ").length,
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
}));
check("mobile workspace is single column", mobileLayout.columns === 1, `${mobileLayout.columns} column(s)`);
check("mobile layout has no horizontal overflow", !mobileLayout.overflow);

// TEST 9: offline / no external network
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
