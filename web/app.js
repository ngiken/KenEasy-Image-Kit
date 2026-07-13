/* KenEasy Image Kit — browser-only, offline-capable (vendored libs) */
(function () {
  "use strict";

  var MAX_FILES = 120;
  var MAX_FILE_BYTES = 40 * 1024 * 1024;
  var LANG_KEY = "keneasy-imagekit-lang";

  var EXT_BY_MIME = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/bmp": "bmp",
  };

  var I18N = {
    zh: {
      pageTitle: "KenEasy Image Kit — 打开就能用的图片压缩/转换工具",
      pageDesc:
        "打开链接即可使用：拖入图片，压缩、改尺寸、转 WebP/JPEG/PNG，打包下载。文件不离开本机，无需安装。",
      tagline: "打开就能用 · 拖入 → 压缩/改尺寸/转格式 → 打包下载 · 文件不上传",
      badgeNoInstall: "无需安装",
      badgeLocal: "本地处理",
      dropzoneAria: "拖入或点击选择要处理的图片",
      dropTitle: "把图片拖到这里",
      dropHint: "或点击选择 · 支持多选",
      dropFormats:
        "支持 PNG / JPG / WEBP / GIF / BMP · 压缩、改尺寸、转格式、打包 zip",
      optionsTitle: "选项",
      optFormat: "输出格式",
      formatOriginal: "保持原格式",
      optQuality: "质量（WebP / JPEG）",
      optMaxEdge: "最长边 (px)，0 = 不缩放",
      optFilename: "打包 zip 文件名",
      optZip: "全部打包成<strong>一个 zip</strong>（关闭则逐张下载）",
      optKeepName: "保留原文件名（仅换扩展名）",
      queueTitle: "图片队列",
      btnClear: "清空",
      btnConvert: "开始处理",
      queueHint:
        '按住手柄 <span class="handle-demo">⠿</span> 拖动可调整顺序。打包 zip 时按此顺序命名。',
      emptyState: "还没有图片。拖入后会出现在这里。",
      statusPreparing: "准备中…",
      tipsTitle: "说明",
      tip1: "处理在你的浏览器内存里完成，图片<strong>不会上传</strong>到任何服务器。",
      tip2: "最长边只会<strong>等比缩小</strong>，不会把小图放大。设 <code>0</code> 表示保持原尺寸。",
      tip3: "质量滑块只对 <code>WebP</code> 与 <code>JPEG</code> 生效；<code>PNG</code> 为无损，忽略质量。",
      tip4: "重编码会<strong>移除 EXIF</strong>（含拍摄信息与方向标记）。若原图带旋转 EXIF，浏览器会先按方向绘制。",
      tip5: "依赖库已放在 <code>web/vendor/</code>，可用本地静态服务<strong>完全离线</strong>使用（推荐 <code>python -m http.server</code>）。",
      footerNote: "开源 · 纯前端 · 可离线",
      githubBtn: "GitHub",
      githubAria: "在 GitHub 打开本项目，欢迎点 Star",
      footerGithub: "GitHub 仓库",
      footerStar: "欢迎 Star ★",
      maxFiles: "一次最多 {n} 个文件",
      fileTooLarge: "{name} 超过 40MB，已跳过",
      notImage: "{name} 不是图片，已跳过",
      addedFiles: "已添加 {n} 张图片",
      dragSort: "拖动排序",
      remove: "移除",
      removeAria: "移除 {name}",
      cannotReadImage: "无法读取图片: {name}",
      noConvertible: "没有可处理的图片",
      zipMissing: "JSZip 未加载（离线包不完整）",
      processing: "处理中 {i} / {n}",
      packaging: "打包 zip…",
      generating: "生成下载…",
      done: "完成",
      downloaded: "已下载 {name}",
      downloading: "下载中…",
      downloadedMany: "已分别下载 {n} 张图片",
      downloadedZip: "已打包下载 {name}",
      failed: "失败",
      convertFailed: "处理失败",
      origSize: "原图 {w}×{h} · {size}",
    },
    en: {
      pageTitle: "KenEasy Image Kit — open and compress/convert images",
      pageDesc:
        "Open the link and go: drop images, compress, resize, convert to WebP/JPEG/PNG, download as a zip. Files never leave your browser. No install.",
      tagline: "Open & go · drop → compress/resize/convert → zip · no upload",
      badgeNoInstall: "No install",
      badgeLocal: "Local only",
      dropzoneAria: "Drop or click to choose images to process",
      dropTitle: "Drop images here",
      dropHint: "or click to choose · multi-select supported",
      dropFormats:
        "PNG / JPG / WEBP / GIF / BMP · compress, resize, convert, zip",
      optionsTitle: "Options",
      optFormat: "Output format",
      formatOriginal: "Keep original",
      optQuality: "Quality (WebP / JPEG)",
      optMaxEdge: "Max edge (px), 0 = no resize",
      optFilename: "Zip filename",
      optZip: "Bundle all into <strong>one zip</strong> (off = download each)",
      optKeepName: "Keep original name (swap extension only)",
      queueTitle: "Image queue",
      btnClear: "Clear",
      btnConvert: "Process",
      queueHint:
        'Hold the handle <span class="handle-demo">⠿</span> to drag and reorder. Zip naming follows this order.',
      emptyState: "No images yet. Drop some and they will show up here.",
      statusPreparing: "Preparing…",
      tipsTitle: "Notes",
      tip1: "Processing runs in your browser memory. Images are <strong>never uploaded</strong> to any server.",
      tip2: "Max edge only <strong>scales down</strong>, never enlarges a small image. Set <code>0</code> to keep the original size.",
      tip3: "The quality slider affects <code>WebP</code> and <code>JPEG</code> only; <code>PNG</code> is lossless and ignores it.",
      tip4: "Re-encoding <strong>strips EXIF</strong> (including capture info and orientation). Rotated EXIF is applied on draw first.",
      tip5: "Libraries live in <code>web/vendor/</code>. You can run fully <strong>offline</strong> with a local static server (recommended: <code>python -m http.server</code>).",
      footerNote: "Open source · frontend only · offline-ready",
      githubBtn: "GitHub",
      githubAria: "Open this project on GitHub — stars welcome",
      footerGithub: "GitHub repo",
      footerStar: "Star ★",
      maxFiles: "Up to {n} files at a time",
      fileTooLarge: "{name} is over 40MB and was skipped",
      notImage: "{name} is not an image and was skipped",
      addedFiles: "Added {n} images",
      dragSort: "Drag to reorder",
      remove: "Remove",
      removeAria: "Remove {name}",
      cannotReadImage: "Cannot read image: {name}",
      noConvertible: "No images to process",
      zipMissing: "JSZip failed to load (offline bundle incomplete)",
      processing: "Processing {i} / {n}",
      packaging: "Packaging zip…",
      generating: "Generating download…",
      done: "Done",
      downloaded: "Downloaded {name}",
      downloading: "Downloading…",
      downloadedMany: "Downloaded {n} images separately",
      downloadedZip: "Packaged and downloaded {name}",
      failed: "Failed",
      convertFailed: "Processing failed",
      origSize: "Original {w}×{h} · {size}",
    },
  };

  // ---------- i18n ----------
  var lang = detectLang();

  function detectLang() {
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (saved === "zh" || saved === "en") return saved;
    } catch (e) {}
    var nav = (navigator.language || "en").toLowerCase();
    return nav.indexOf("zh") === 0 ? "zh" : "en";
  }

  function t(key, vars) {
    var dict = I18N[lang] || I18N.en;
    var s = dict[key];
    if (s == null) s = (I18N.en[key] != null ? I18N.en[key] : key);
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (_, k) {
        return vars[k] != null ? vars[k] : "{" + k + "}";
      });
    }
    return s;
  }

  function applyStaticI18n() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = t("pageTitle");
    var descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute("content", t("pageDesc"));

    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute("data-i18n"));
    }
    var htmlNodes = document.querySelectorAll("[data-i18n-html]");
    for (var j = 0; j < htmlNodes.length; j++) {
      htmlNodes[j].innerHTML = t(htmlNodes[j].getAttribute("data-i18n-html"));
    }
    var ariaNodes = document.querySelectorAll("[data-i18n-aria-label]");
    for (var k = 0; k < ariaNodes.length; k++) {
      ariaNodes[k].setAttribute(
        "aria-label",
        t(ariaNodes[k].getAttribute("data-i18n-aria-label"))
      );
    }
  }

  function setLang(next) {
    lang = next;
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch (e) {}
    if (els.langZh) els.langZh.setAttribute("aria-pressed", String(next === "zh"));
    if (els.langEn) els.langEn.setAttribute("aria-pressed", String(next === "en"));
    applyStaticI18n();
    renderList();
  }

  // ---------- DOM ----------
  var els = {};
  var items = [];
  var uid = 0;
  var sortable = null;
  var busy = false;

  function $(id) {
    return document.getElementById(id);
  }

  // ---------- helpers ----------
  function formatBytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(2) + " MB";
  }

  function sanitizeFilename(name) {
    return String(name || "")
      .replace(/[\\/:*?"<>| -]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "image";
  }

  function baseName(name) {
    return String(name || "").replace(/\.[^./\\]+$/, "");
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 4000);
  }

  function sleep(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }

  var toastTimer = null;
  function toast(msg, isError) {
    var el = els.toast;
    if (!el) return;
    el.textContent = msg;
    el.className = "toast show" + (isError ? " error" : "");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.className = "toast";
    }, 2600);
  }

  // ---------- queue ----------
  function isImageFile(file) {
    if (file.type && file.type.indexOf("image/") === 0) return true;
    return /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name || "");
  }

  function addFiles(fileList) {
    var arr = Array.prototype.slice.call(fileList || []);
    if (!arr.length) return;

    var added = 0;
    for (var i = 0; i < arr.length; i++) {
      var file = arr[i];
      if (items.length >= MAX_FILES) {
        toast(t("maxFiles", { n: MAX_FILES }), true);
        break;
      }
      if (!isImageFile(file)) {
        toast(t("notImage", { name: file.name }), true);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast(t("fileTooLarge", { name: file.name }), true);
        continue;
      }
      var previewUrl = null;
      try {
        previewUrl = URL.createObjectURL(file);
      } catch (e) {}
      items.push({
        id: "it" + ++uid,
        file: file,
        name: file.name,
        size: file.size,
        previewUrl: previewUrl,
        width: 0,
        height: 0,
        isNew: true,
      });
      added++;
    }

    if (added > 0) {
      renderList();
      toast(t("addedFiles", { n: added }));
    }
  }

  function removeItem(id) {
    var li = els.fileList.querySelector('li[data-id="' + id + '"]');
    var idx = indexOfId(id);
    if (idx < 0) return;
    var it = items[idx];
    function finalize() {
      if (it.previewUrl) {
        try {
          URL.revokeObjectURL(it.previewUrl);
        } catch (e) {}
      }
      items.splice(idx, 1);
      renderList();
    }
    if (li) {
      li.classList.add("removing");
      setTimeout(finalize, 320);
    } else {
      finalize();
    }
  }

  function clearAll() {
    for (var i = 0; i < items.length; i++) {
      if (items[i].previewUrl) {
        try {
          URL.revokeObjectURL(items[i].previewUrl);
        } catch (e) {}
      }
    }
    items = [];
    renderList();
    hideStatus();
  }

  function indexOfId(id) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return i;
    }
    return -1;
  }

  function syncOrderFromDom() {
    var lis = els.fileList.querySelectorAll("li[data-id]");
    var next = [];
    for (var i = 0; i < lis.length; i++) {
      var idx = indexOfId(lis[i].getAttribute("data-id"));
      if (idx >= 0) next.push(items[idx]);
    }
    if (next.length === items.length) items = next;
  }

  function renderList() {
    var list = els.fileList;
    list.innerHTML = "";

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var li = document.createElement("li");
      li.className = "file-item" + (it.isNew ? " new-item" : "");
      li.setAttribute("data-id", it.id);

      var handle = document.createElement("div");
      handle.className = "handle";
      handle.title = t("dragSort");
      handle.textContent = "⠿";

      var thumb = document.createElement("div");
      thumb.className = "thumb";
      if (it.previewUrl) {
        var img = document.createElement("img");
        img.alt = "";
        img.loading = "lazy";
        img.src = it.previewUrl;
        (function (item, imageEl) {
          imageEl.onload = function () {
            if (!item.width) {
              item.width = imageEl.naturalWidth;
              item.height = imageEl.naturalHeight;
              var subEl = list.querySelector(
                'li[data-id="' + item.id + '"] .sub'
              );
              if (subEl) {
                subEl.textContent = t("origSize", {
                  w: item.width,
                  h: item.height,
                  size: formatBytes(item.size),
                });
              }
            }
          };
        })(it, img);
        thumb.appendChild(img);
      } else {
        thumb.textContent = "IMG";
      }

      var meta = document.createElement("div");
      meta.className = "meta";
      var nameEl = document.createElement("div");
      nameEl.className = "name";
      nameEl.textContent = it.name;
      var sub = document.createElement("div");
      sub.className = "sub";
      sub.textContent = it.width
        ? t("origSize", { w: it.width, h: it.height, size: formatBytes(it.size) })
        : formatBytes(it.size);
      meta.appendChild(nameEl);
      meta.appendChild(sub);

      var kind = document.createElement("span");
      kind.className = "kind image";
      kind.textContent = extLabel(it.name);

      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "icon-btn";
      rm.setAttribute("aria-label", t("removeAria", { name: it.name }));
      rm.title = t("remove");
      rm.textContent = "×";
      (function (id) {
        rm.addEventListener("click", function () {
          if (busy) return;
          removeItem(id);
        });
      })(it.id);

      li.appendChild(handle);
      li.appendChild(thumb);
      li.appendChild(meta);
      li.appendChild(kind);
      li.appendChild(rm);
      list.appendChild(li);

      it.isNew = false;
    }

    els.fileCount.textContent = String(items.length);
    els.emptyState.hidden = items.length > 0;
    els.btnClear.disabled = items.length === 0 || busy;
    els.btnConvert.disabled = items.length === 0 || busy;

    if (!sortable && window.Sortable) {
      sortable = window.Sortable.create(list, {
        handle: ".handle",
        animation: 150,
        ghostClass: "sortable-ghost",
        dragClass: "sortable-drag",
        onEnd: syncOrderFromDom,
      });
    }
  }

  function extLabel(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || "");
    return (m ? m[1] : "img").toUpperCase();
  }

  // ---------- status ----------
  function showStatus() {
    els.statusPanel.hidden = false;
  }
  function hideStatus() {
    els.statusPanel.hidden = true;
    setStatus(0, "");
    els.statusDetail.textContent = "";
  }
  function setStatus(pct, text) {
    var p = Math.max(0, Math.min(100, Math.round(pct)));
    els.progressBar.style.width = p + "%";
    els.statusPct.textContent = p + "%";
    if (text != null) els.statusText.textContent = text;
  }

  // ---------- image processing ----------
  function loadImage(item) {
    return new Promise(function (resolve, reject) {
      var url = item.previewUrl || URL.createObjectURL(item.file);
      var img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error("decode"));
      };
      img.src = url;
    });
  }

  function targetType(item, formatOpt) {
    if (formatOpt !== "original") return formatOpt;
    var mt = item.file.type;
    if (mt === "image/png" || mt === "image/webp" || mt === "image/jpeg") return mt;
    if (/\.png$/i.test(item.name)) return "image/png";
    if (/\.webp$/i.test(item.name)) return "image/webp";
    // gif/bmp/other → default to png to stay lossless-ish
    return "image/png";
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      if (canvas.toBlob) {
        canvas.toBlob(
          function (blob) {
            if (blob) resolve(blob);
            else reject(new Error("toBlob-null"));
          },
          type,
          quality
        );
      } else {
        try {
          var dataUrl = canvas.toDataURL(type, quality);
          var parts = dataUrl.split(",");
          var byteString = atob(parts[1]);
          var mimeMatch = /data:([^;]+)/.exec(parts[0]);
          var mime = mimeMatch ? mimeMatch[1] : type;
          var ab = new Uint8Array(byteString.length);
          for (var i = 0; i < byteString.length; i++) {
            ab[i] = byteString.charCodeAt(i);
          }
          resolve(new Blob([ab], { type: mime }));
        } catch (e) {
          reject(e);
        }
      }
    });
  }

  function processOne(item, opts) {
    return loadImage(item).then(function (img) {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      if (!w || !h) throw new Error("size");
      if (!item.width) {
        item.width = w;
        item.height = h;
      }

      var scale = 1;
      if (opts.maxEdge > 0) {
        var longest = Math.max(w, h);
        if (longest > opts.maxEdge) scale = opts.maxEdge / longest;
      }
      var tw = Math.max(1, Math.round(w * scale));
      var th = Math.max(1, Math.round(h * scale));

      var type = targetType(item, opts.format);
      var canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      var ctx = canvas.getContext("2d");
      // JPEG has no alpha — paint white so transparent PNG/WebP don't turn black.
      if (type === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, tw, th);
      }
      ctx.drawImage(img, 0, 0, tw, th);

      var quality =
        type === "image/png" ? undefined : opts.quality;

      return canvasToBlob(canvas, type, quality).then(function (blob) {
        return { blob: blob, type: type, w: tw, h: th };
      });
    });
  }

  function outputName(item, type, keepName, index, usedNames) {
    var ext = EXT_BY_MIME[type] || "img";
    var base = keepName ? baseName(item.name) : "image-" + (index + 1);
    base = sanitizeFilename(base);
    var name = base + "." + ext;
    if (usedNames) {
      var n = 1;
      while (usedNames[name.toLowerCase()]) {
        name = base + "-" + ++n + "." + ext;
      }
      usedNames[name.toLowerCase()] = true;
    }
    return name;
  }

  function readOptions() {
    var quality = parseFloat(els.optQuality.value);
    if (isNaN(quality)) quality = 0.82;
    var maxEdge = parseInt(els.optMaxEdge.value, 10);
    if (isNaN(maxEdge) || maxEdge < 0) maxEdge = 0;
    return {
      format: els.optFormat.value,
      quality: quality,
      maxEdge: maxEdge,
      zip: els.optZip.checked,
      keepName: els.optKeepName.checked,
      filename: sanitizeFilename(els.optFilename.value || "images"),
    };
  }

  function processAll() {
    if (busy) return;
    if (!items.length) {
      toast(t("noConvertible"), true);
      return;
    }
    var opts = readOptions();
    if (opts.zip && !window.JSZip) {
      toast(t("zipMissing"), true);
      return;
    }

    busy = true;
    els.btnConvert.disabled = true;
    els.btnClear.disabled = true;
    showStatus();
    setStatus(2, t("statusPreparing"));

    var results = [];
    var usedNames = {};
    var total = items.length;
    var queue = items.slice();

    var chain = Promise.resolve();
    queue.forEach(function (item, i) {
      chain = chain.then(function () {
        setStatus(
          2 + (i / total) * 86,
          t("processing", { i: i + 1, n: total })
        );
        return processOne(item, opts)
          .then(function (out) {
            var name = outputName(
              item,
              out.type,
              opts.keepName,
              i,
              usedNames
            );
            results.push({ blob: out.blob, name: name });
          })
          .catch(function () {
            toast(t("cannotReadImage", { name: item.name }), true);
          })
          .then(function () {
            return sleep(0);
          });
      });
    });

    chain
      .then(function () {
        if (!results.length) throw new Error("none");
        if (opts.zip) {
          setStatus(90, t("packaging"));
          var zip = new window.JSZip();
          for (var i = 0; i < results.length; i++) {
            zip.file(results[i].name, results[i].blob);
          }
          return zip
            .generateAsync(
              { type: "blob", compression: "STORE" },
              function (meta) {
                setStatus(90 + meta.percent * 0.08, t("packaging"));
              }
            )
            .then(function (blob) {
              setStatus(99, t("generating"));
              var zname = opts.filename;
              if (!/\.zip$/i.test(zname)) zname += ".zip";
              downloadBlob(blob, zname);
              setStatus(100, t("done"));
              toast(t("downloadedZip", { name: zname }));
            });
        } else {
          // separate downloads, staggered
          var idx = 0;
          function next() {
            if (idx >= results.length) {
              setStatus(100, t("done"));
              toast(t("downloadedMany", { n: results.length }));
              return Promise.resolve();
            }
            var r = results[idx++];
            setStatus(90 + (idx / results.length) * 9, t("downloading"));
            downloadBlob(r.blob, r.name);
            return sleep(350).then(next);
          }
          return next();
        }
      })
      .catch(function (err) {
        if (err && err.message === "none") {
          toast(t("noConvertible"), true);
        } else {
          toast(t("convertFailed"), true);
        }
        setStatus(0, t("failed"));
      })
      .then(function () {
        busy = false;
        els.btnConvert.disabled = items.length === 0;
        els.btnClear.disabled = items.length === 0;
        setTimeout(function () {
          if (!busy) hideStatus();
        }, 2200);
      });
  }

  // ---------- drag & drop ----------
  var dragDepth = 0;

  function clearDropHighlight() {
    dragDepth = 0;
    els.dropzone.classList.remove("dragover");
  }

  function wireDropzone() {
    var dz = els.dropzone;

    dz.addEventListener("click", function () {
      if (busy) return;
      els.fileInput.click();
    });
    dz.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!busy) els.fileInput.click();
      }
    });

    els.fileInput.addEventListener("change", function () {
      addFiles(els.fileInput.files);
      els.fileInput.value = "";
    });

    dz.addEventListener("dragenter", function (e) {
      e.preventDefault();
      dragDepth++;
      dz.classList.add("dragover");
    });
    dz.addEventListener("dragover", function (e) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    });
    dz.addEventListener("dragleave", function (e) {
      e.preventDefault();
      dragDepth--;
      if (dragDepth <= 0) clearDropHighlight();
    });
    dz.addEventListener("drop", function (e) {
      e.preventDefault();
      clearDropHighlight();
      if (busy) return;
      if (e.dataTransfer && e.dataTransfer.files) {
        addFiles(e.dataTransfer.files);
      }
    });

    // stop the browser from navigating when dropping outside the zone
    window.addEventListener("dragover", function (e) {
      e.preventDefault();
    });
    window.addEventListener("drop", function (e) {
      e.preventDefault();
    });
  }

  // ---------- init ----------
  function init() {
    els.dropzone = $("dropzone");
    els.fileInput = $("fileInput");
    els.fileList = $("fileList");
    els.fileCount = $("fileCount");
    els.emptyState = $("emptyState");
    els.btnClear = $("btnClear");
    els.btnConvert = $("btnConvert");
    els.statusPanel = $("statusPanel");
    els.statusText = $("statusText");
    els.statusPct = $("statusPct");
    els.statusDetail = $("statusDetail");
    els.progressBar = $("progressBar");
    els.optFormat = $("optFormat");
    els.optQuality = $("optQuality");
    els.qualityValue = $("qualityValue");
    els.optMaxEdge = $("optMaxEdge");
    els.optZip = $("optZip");
    els.optKeepName = $("optKeepName");
    els.optFilename = $("optFilename");
    els.langZh = $("langZh");
    els.langEn = $("langEn");

    // toast element
    els.toast = document.createElement("div");
    els.toast.className = "toast";
    els.toast.setAttribute("role", "status");
    els.toast.setAttribute("aria-live", "polite");
    document.body.appendChild(els.toast);

    els.btnClear.addEventListener("click", function () {
      if (!busy) clearAll();
    });
    els.btnConvert.addEventListener("click", processAll);

    els.optQuality.addEventListener("input", function () {
      els.qualityValue.textContent = parseFloat(els.optQuality.value).toFixed(2);
    });
    els.qualityValue.textContent = parseFloat(els.optQuality.value).toFixed(2);

    function updateQualityEnabled() {
      var f = els.optFormat.value;
      var usesQuality = f === "image/webp" || f === "image/jpeg" || f === "original";
      var field = $("qualityField");
      if (field) field.style.opacity = usesQuality ? "1" : "0.45";
      els.optQuality.disabled = !usesQuality;
    }
    els.optFormat.addEventListener("change", updateQualityEnabled);
    updateQualityEnabled();

    if (els.langZh)
      els.langZh.addEventListener("click", function () {
        setLang("zh");
      });
    if (els.langEn)
      els.langEn.addEventListener("click", function () {
        setLang("en");
      });

    wireDropzone();
    applyStaticI18n();
    setLang(lang);
    renderList();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
