/* KenEasy Image Kit — UI/application layer. Domain rules live in config.js and image-engine.js. */
(function (global) {
  "use strict";

  var config = global.KenEasyImageKitConfig;
  var i18nFactory = global.KenEasyImageKitI18n;
  var engineFactory = global.KenEasyImageEngine;
  if (!config || !i18nFactory || !engineFactory) {
    throw new Error("KenEasy Image Kit core modules failed to load");
  }

  var i18n = i18nFactory.create(config);
  var engine = engineFactory.create(config);
  var els = {};
  var items = [];
  var uid = 0;
  var sortable = null;
  var busy = false;
  var dragDepth = 0;
  var toastTimer = null;
  var statusHideTimer = null;
  var saveTimer = null;
  var currentTheme = "light";

  function $(id) {
    return document.getElementById(id);
  }

  function t(key, variables) {
    return i18n.t(key, variables);
  }

  function clamp(number, min, max) {
    return Math.max(min, Math.min(max, number));
  }

  function systemTheme() {
    return global.matchMedia && global.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function loadTheme() {
    try {
      var saved = localStorage.getItem(config.storageKeys.appearance);
      if (saved === "light" || saved === "dark") return saved;
    } catch (error) {}
    return systemTheme();
  }

  function syncThemeControl() {
    if (!els.themeToggle) return;
    var label = t(currentTheme === "dark" ? "themeToLight" : "themeToDark");
    els.themeToggle.setAttribute("aria-label", label);
    els.themeToggle.setAttribute("title", label);
    els.themeToggle.setAttribute("aria-pressed", String(currentTheme === "dark"));
  }

  function applyTheme(next, persist) {
    currentTheme = next === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", currentTheme);
    var themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", currentTheme === "dark" ? "#09090b" : "#f5f5f7");
    if (persist) {
      try { localStorage.setItem(config.storageKeys.appearance, currentTheme); } catch (error) {}
    }
    syncThemeControl();
  }

  function toggleTheme() {
    applyTheme(currentTheme === "dark" ? "light" : "dark", true);
  }

  function applyStaticI18n() {
    var language = i18n.getLanguage();
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = t("pageTitle");
    var description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", t("pageDesc"));

    var sharedVariables = {
      maxFileSize: engine.formatBytes(config.limits.maxFileBytes),
      maxFiles: config.limits.maxFiles,
    };
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (node) {
      node.textContent = t(node.getAttribute("data-i18n"), sharedVariables);
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-html]"), function (node) {
      node.innerHTML = t(node.getAttribute("data-i18n-html"));
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-aria-label]"), function (node) {
      node.setAttribute("aria-label", t(node.getAttribute("data-i18n-aria-label")));
    });

    els.langZh.setAttribute("aria-pressed", String(language === "zh"));
    els.langEn.setAttribute("aria-pressed", String(language === "en"));
    syncThemeControl();
    syncWorkflowState();
    syncPrimaryAction();
  }

  function setLanguage(next) {
    i18n.setLanguage(next);
    applyStaticI18n();
    renderPresets();
    renderList();
    syncControlPresentation();
  }

  function normalizeSettings(candidate) {
    var defaults = config.defaults;
    var allowedFormats = config.outputOptions.map(function (option) { return option.value; });
    var quality = parseFloat(candidate && candidate.quality);
    var maxEdge = parseInt(candidate && candidate.maxEdge, 10);
    var format = candidate && allowedFormats.indexOf(candidate.format) >= 0 ? candidate.format : defaults.format;
    return {
      format: format,
      quality: isNaN(quality) ? defaults.quality : clamp(quality, 0.4, 1),
      maxEdge: isNaN(maxEdge) ? defaults.maxEdge : clamp(maxEdge, 0, 20000),
      zip: candidate && typeof candidate.zip === "boolean" ? candidate.zip : defaults.zip,
      keepName: candidate && typeof candidate.keepName === "boolean" ? candidate.keepName : defaults.keepName,
      filename: engine.sanitizeFilename(candidate && candidate.filename || defaults.filename),
    };
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(config.storageKeys.settings);
      return normalizeSettings(raw ? JSON.parse(raw) : config.defaults);
    } catch (error) {
      return normalizeSettings(config.defaults);
    }
  }

  function applySettings(settings) {
    els.optFormat.value = settings.format;
    els.optQuality.value = String(settings.quality);
    els.optMaxEdge.value = String(settings.maxEdge);
    els.optZip.checked = settings.zip;
    els.optKeepName.checked = settings.keepName;
    els.optFilename.value = settings.filename;
  }

  function readOptions() {
    var settings = normalizeSettings({
      format: els.optFormat.value,
      quality: els.optQuality.value,
      maxEdge: els.optMaxEdge.value,
      zip: els.optZip.checked,
      keepName: els.optKeepName.checked,
      filename: els.optFilename.value,
    });
    els.optQuality.value = String(settings.quality);
    els.optMaxEdge.value = String(settings.maxEdge);
    return settings;
  }

  function scheduleSettingsSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(config.storageKeys.settings, JSON.stringify(readOptions()));
      } catch (error) {}
    }, 120);
  }

  function renderFormatOptions() {
    var selected = els.optFormat.value || config.defaults.format;
    els.optFormat.innerHTML = "";
    config.outputOptions.forEach(function (rule) {
      var option = document.createElement("option");
      option.value = rule.value;
      option.textContent = rule.labelKey ? t(rule.labelKey) : rule.label;
      if (rule.labelKey) option.setAttribute("data-i18n", rule.labelKey);
      els.optFormat.appendChild(option);
    });
    els.optFormat.value = config.outputOptions.some(function (rule) { return rule.value === selected; })
      ? selected : config.defaults.format;
    els.fileInput.accept = config.input.mimeTypes.concat(config.input.accept.map(function (extension) {
      return "." + extension;
    })).join(",");
  }

  function renderPresets() {
    els.presetList.innerHTML = "";
    config.presets.forEach(function (preset) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "preset-btn";
      button.setAttribute("data-preset-id", preset.id);
      button.setAttribute("aria-pressed", "false");
      var name = document.createElement("strong");
      name.textContent = t(preset.nameKey);
      var description = document.createElement("small");
      description.textContent = t(preset.descKey);
      button.appendChild(name);
      button.appendChild(description);
      button.addEventListener("click", function () {
        if (busy) return;
        applyPreset(preset);
      });
      els.presetList.appendChild(button);
    });
    updateActivePreset();
  }

  function applyPreset(preset) {
    els.optFormat.value = preset.values.format;
    els.optQuality.value = String(preset.values.quality);
    els.optMaxEdge.value = String(preset.values.maxEdge);
    resetResults();
    syncControlPresentation();
    scheduleSettingsSave();
    toast(t("presetApplied", { name: t(preset.nameKey) }));
  }

  function updateActivePreset() {
    if (!els.presetList) return;
    var options = readOptions();
    var buttons = els.presetList.querySelectorAll(".preset-btn");
    Array.prototype.forEach.call(buttons, function (button) {
      var preset = null;
      for (var i = 0; i < config.presets.length; i++) {
        if (config.presets[i].id === button.getAttribute("data-preset-id")) {
          preset = config.presets[i];
          break;
        }
      }
      var active = !!preset &&
        options.format === preset.values.format &&
        Math.abs(options.quality - preset.values.quality) < 0.001 &&
        options.maxEdge === preset.values.maxEdge;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
      button.disabled = busy;
    });
  }

  function syncControlPresentation() {
    var options = readOptions();
    var qualityEnabled = engine.formatUsesQuality(options.format) && !busy;
    var qualityPercent = Math.round(options.quality * 100);
    var rangeProgress = ((options.quality - 0.4) / 0.6) * 100;
    els.qualityValue.textContent = qualityPercent + "%";
    els.optQuality.style.setProperty("--range-progress", clamp(rangeProgress, 0, 100) + "%");
    els.optQuality.setAttribute("aria-valuetext", qualityPercent + "%");
    els.optQuality.disabled = !qualityEnabled;
    els.qualityField.classList.toggle("is-disabled", !engine.formatUsesQuality(options.format));
    els.qualityHelp.textContent = engine.formatUsesQuality(options.format) ? "" : t("qualityDisabled");

    var formatRule = config.outputOptions.find(function (rule) { return rule.value === options.format; });
    els.formatHelp.textContent = t(formatRule ? formatRule.helpKey : config.outputOptions[0].helpKey);

    els.optFilename.disabled = busy || !options.zip;
    els.zipNameField.classList.toggle("is-disabled", !options.zip);
    els.optFormat.disabled = busy;
    els.optMaxEdge.disabled = busy;
    els.optZip.disabled = busy;
    els.optKeepName.disabled = busy;
    els.fileInput.disabled = busy;
    els.dropzone.setAttribute("aria-disabled", String(busy));
    els.main.setAttribute("aria-busy", String(busy));
    updateActivePreset();
  }

  function handleOptionChange() {
    if (busy) return;
    resetResults();
    syncControlPresentation();
    scheduleSettingsSave();
  }

  function totalInputSize() {
    return items.reduce(function (sum, item) { return sum + item.size; }, 0);
  }

  function workflowPhase() {
    if (!items.length) return 1;
    if (busy) return 3;
    var finished = items.every(function (item) {
      return item.state === "done" || item.state === "error";
    });
    return finished ? 4 : 2;
  }

  function syncWorkflowState() {
    if (!els.workflowSteps) return;
    var phase = workflowPhase();
    var steps = els.workflowSteps.querySelectorAll("[data-workflow-step]");
    Array.prototype.forEach.call(steps, function (step) {
      var number = parseInt(step.getAttribute("data-workflow-step"), 10);
      var active = phase <= 3 && number === phase;
      var complete = phase === 4 || number < phase;
      step.classList.toggle("active", active);
      step.classList.toggle("complete", complete);
      if (active) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
      var nameNode = step.querySelector("[data-i18n]");
      var name = nameNode ? t(nameNode.getAttribute("data-i18n")) : String(number);
      var state = t(active ? "workflowStateCurrent" : complete ? "workflowStateComplete" : "workflowStateUpcoming");
      step.setAttribute("aria-label", t("workflowStepLabel", { n: number, name: name, state: state }));
    });
  }

  function syncPrimaryAction() {
    if (!els.btnConvert || !els.btnConvertLabel) return;
    els.btnConvertLabel.textContent = t(busy ? "btnWorking" : "btnConvert");
    els.btnConvert.classList.toggle("is-busy", busy);
    els.btnConvert.setAttribute("aria-busy", String(busy));
  }

  function updateQueueSummary() {
    var count = items.length;
    els.fileCount.textContent = count ? t("queueCount", { n: count }) : t("queueEmptyCount");
    els.totalSize.textContent = t("queueTotal", { size: engine.formatBytes(totalInputSize()) });
    els.actionHint.textContent = count
      ? t("actionReady", { n: count, size: engine.formatBytes(totalInputSize()) })
      : t("actionEmpty");
    els.btnCount.textContent = String(count);
    els.btnCount.hidden = count === 0;
    els.emptyState.hidden = count > 0;
    els.btnClear.disabled = count === 0 || busy;
    els.btnConvert.disabled = count === 0 || busy;
    els.dropzone.classList.toggle("has-files", count > 0);
    syncWorkflowState();
    syncPrimaryAction();
  }

  function isImageFile(file) {
    return engine.isImageFile(file);
  }

  function addFiles(fileList) {
    if (busy) return;
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var added = 0;
    var skipped = 0;

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (items.length >= config.limits.maxFiles) {
        skipped += files.length - i;
        toast(t("maxFiles", { n: config.limits.maxFiles }), true);
        break;
      }
      if (!isImageFile(file)) {
        skipped += 1;
        continue;
      }
      if (file.size > config.limits.maxFileBytes) {
        skipped += 1;
        continue;
      }
      var previewUrl = null;
      try { previewUrl = URL.createObjectURL(file); } catch (error) {}
      items.push({
        id: "it" + ++uid,
        file: file,
        name: file.name,
        size: file.size,
        previewUrl: previewUrl,
        width: 0,
        height: 0,
        state: "pending",
        result: null,
        isNew: true,
        removing: false,
      });
      added += 1;
    }

    if (added) renderList();
    if (skipped) {
      toast(t("filesResult", { added: added, skipped: skipped }), true);
    } else if (added) {
      toast(t("addedFiles", { n: added }));
    }
  }

  function indexOfId(id) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return i;
    }
    return -1;
  }

  function releasePreview(item) {
    if (!item || !item.previewUrl) return;
    try { URL.revokeObjectURL(item.previewUrl); } catch (error) {}
    item.previewUrl = null;
  }

  function removeItem(id) {
    var index = indexOfId(id);
    if (index < 0 || items[index].removing || busy) return;
    items[index].removing = true;
    var row = els.fileList.querySelector('li[data-id="' + id + '"]');
    if (row) row.classList.add("removing");

    setTimeout(function () {
      var liveIndex = indexOfId(id);
      if (liveIndex < 0) return;
      releasePreview(items[liveIndex]);
      items.splice(liveIndex, 1);
      renderList();
    }, row ? 250 : 0);
  }

  function clearAll() {
    if (busy) return;
    items.forEach(releasePreview);
    items = [];
    renderList();
    hideStatus();
  }

  function moveItem(id, delta) {
    if (busy) return;
    var index = indexOfId(id);
    var nextIndex = clamp(index + delta, 0, items.length - 1);
    if (index < 0 || index === nextIndex) return;
    var moved = items.splice(index, 1)[0];
    items.splice(nextIndex, 0, moved);
    renderList();
    var handle = els.fileList.querySelector('li[data-id="' + id + '"] .handle');
    if (handle) handle.focus();
  }

  function syncOrderFromDom() {
    var rows = els.fileList.querySelectorAll("li[data-id]");
    var ordered = [];
    Array.prototype.forEach.call(rows, function (row) {
      var index = indexOfId(row.getAttribute("data-id"));
      if (index >= 0) ordered.push(items[index]);
    });
    if (ordered.length === items.length) items = ordered;
    updateQueueSummary();
  }

  function extensionLabel(name) {
    return (engine.extensionFromName(name) || "img").toUpperCase();
  }

  function itemStatusLabel(item) {
    if (item.state === "processing") return t("itemProcessing");
    if (item.state === "done" && item.result) return extensionLabel(item.result.name);
    if (item.state === "error") return t("itemError");
    return extensionLabel(item.name);
  }

  function itemSubtitle(item) {
    if (item.state === "done" && item.result) {
      return t("itemResult", {
        w: item.result.width || item.width || "—",
        h: item.result.height || item.height || "—",
        size: engine.formatBytes(item.result.size),
      });
    }
    if (item.state === "processing") return t("itemProcessing");
    if (item.state === "error") return item.errorMessage || t("itemError");
    if (item.width && item.height) {
      return t("origSize", { w: item.width, h: item.height, size: engine.formatBytes(item.size) });
    }
    return engine.formatBytes(item.size);
  }

  function renderList() {
    els.fileList.innerHTML = "";
    items.forEach(function (item) {
      var row = document.createElement("li");
      row.className = "file-item" + (item.isNew ? " new-item" : "") + (item.state !== "pending" ? " is-" + item.state : "");
      row.setAttribute("data-id", item.id);

      var handle = document.createElement("button");
      handle.type = "button";
      handle.className = "handle";
      handle.textContent = "⠿";
      handle.title = t("dragSort", { name: item.name });
      handle.setAttribute("aria-label", t("dragSort", { name: item.name }));
      handle.addEventListener("keydown", function (event) {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          moveItem(item.id, event.key === "ArrowUp" ? -1 : 1);
        }
      });

      var thumb = document.createElement("div");
      thumb.className = "thumb";
      if (item.previewUrl) {
        var image = document.createElement("img");
        image.alt = "";
        image.loading = "lazy";
        image.src = item.previewUrl;
        image.onload = function () {
          if (!item.width) {
            item.width = image.naturalWidth;
            item.height = image.naturalHeight;
            var subtitle = els.fileList.querySelector('li[data-id="' + item.id + '"] .sub');
            if (subtitle) subtitle.textContent = itemSubtitle(item);
          }
        };
        thumb.appendChild(image);
      } else {
        thumb.textContent = "IMG";
      }

      var meta = document.createElement("div");
      meta.className = "meta";
      var name = document.createElement("div");
      name.className = "name";
      name.textContent = item.name;
      name.title = item.name;
      var subtitle = document.createElement("div");
      subtitle.className = "sub";
      subtitle.textContent = itemSubtitle(item);
      meta.appendChild(name);
      meta.appendChild(subtitle);

      var kind = document.createElement("span");
      kind.className = "kind";
      kind.textContent = itemStatusLabel(item);

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-btn";
      remove.textContent = "×";
      remove.title = t("remove");
      remove.setAttribute("aria-label", t("removeAria", { name: item.name }));
      remove.disabled = busy;
      remove.addEventListener("click", function () { removeItem(item.id); });

      row.appendChild(handle);
      row.appendChild(thumb);
      row.appendChild(meta);
      row.appendChild(kind);
      row.appendChild(remove);
      els.fileList.appendChild(row);
      item.isNew = false;
    });

    updateQueueSummary();
    if (!sortable && global.Sortable) {
      sortable = global.Sortable.create(els.fileList, {
        handle: ".handle",
        animation: 160,
        ghostClass: "sortable-ghost",
        dragClass: "sortable-drag",
        onEnd: syncOrderFromDom,
      });
    }
    if (sortable && typeof sortable.option === "function") sortable.option("disabled", busy);
  }

  function resetResults() {
    var changed = false;
    items.forEach(function (item) {
      if (item.state !== "pending" || item.result) changed = true;
      item.state = "pending";
      item.result = null;
      item.errorMessage = "";
    });
    if (changed) {
      renderList();
      hideStatus();
    }
  }

  function updateItemState(item, state, result, errorMessage) {
    item.state = state;
    item.result = result || null;
    item.errorMessage = errorMessage || "";
    var row = els.fileList.querySelector('li[data-id="' + item.id + '"]');
    if (!row) return;
    row.classList.remove("is-processing", "is-done", "is-error");
    if (state !== "pending") row.classList.add("is-" + state);
    var kind = row.querySelector(".kind");
    var subtitle = row.querySelector(".sub");
    if (kind) kind.textContent = itemStatusLabel(item);
    if (subtitle) subtitle.textContent = itemSubtitle(item);
  }

  function showStatus() {
    if (statusHideTimer) clearTimeout(statusHideTimer);
    els.statusPanel.hidden = false;
  }

  function hideStatus() {
    els.statusPanel.hidden = true;
    setStatus(0, "");
    els.statusDetail.textContent = "";
  }

  function setStatus(percent, text) {
    var rounded = clamp(Math.round(percent), 0, 100);
    els.progressBar.style.width = rounded + "%";
    els.statusPct.textContent = rounded + "%";
    els.progressTrack.setAttribute("aria-valuenow", String(rounded));
    if (text != null) els.statusText.textContent = text;
  }

  function setBusy(next) {
    busy = next;
    renderList();
    syncControlPresentation();
  }

  function toast(message, isError) {
    els.toast.textContent = message;
    els.toast.className = "toast show" + (isError ? " error" : "");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.className = "toast"; }, 2800);
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function errorMessageFor(item, error) {
    if (error && error.code === "canvas-limit") return t("canvasLimit", { name: item.name });
    if (error && error.code === "unsupported-output") return t("unsupportedOutput", { name: item.name });
    return t("cannotReadImage", { name: item.name });
  }

  function resultSummary(results, total) {
    var before = results.reduce(function (sum, result) { return sum + result.sourceSize; }, 0);
    var after = results.reduce(function (sum, result) { return sum + result.blob.size; }, 0);
    var variables = {
      ok: results.length,
      total: total,
      before: engine.formatBytes(before),
      after: engine.formatBytes(after),
      percent: before ? Math.round(Math.abs(1 - after / before) * 100) : 0,
    };
    if (!before || Math.abs(after - before) / before < 0.005) return t("summarySame", variables);
    return after < before ? t("summaryReduced", variables) : t("summaryIncreased", variables);
  }

  function processAll() {
    if (busy) return;
    if (!items.length) {
      toast(t("noConvertible"), true);
      return;
    }
    var options = readOptions();
    if (options.zip && !global.JSZip) {
      toast(t("zipMissing"), true);
      return;
    }

    resetResults();
    setBusy(true);
    showStatus();
    setStatus(2, t("statusPreparing"));
    var queue = items.slice();
    var results = [];
    var usedNames = {};

    Promise.resolve().then(async function () {
      for (var i = 0; i < queue.length; i++) {
        var item = queue[i];
        setStatus(3 + (i / queue.length) * 84, t("processing", { i: i + 1, n: queue.length }));
        updateItemState(item, "processing");
        try {
          var output = await engine.process(item, options);
          var name = engine.outputName(item, output.type, options.keepName, i, usedNames);
          var result = {
            blob: output.blob,
            name: name,
            width: output.width,
            height: output.height,
            type: output.type,
            sourceSize: item.size,
          };
          results.push(result);
          updateItemState(item, "done", {
            name: name,
            width: output.width,
            height: output.height,
            size: output.blob.size,
          });
        } catch (error) {
          var message = errorMessageFor(item, error);
          updateItemState(item, "error", null, message);
        }
        await wait(0);
      }

      if (!results.length) throw new Error("none");
      if (options.zip) {
        setStatus(90, t("packaging"));
        var zip = new global.JSZip();
        results.forEach(function (result) { zip.file(result.name, result.blob); });
        var archive = await zip.generateAsync(
          { type: "blob", compression: "STORE" },
          function (meta) { setStatus(90 + meta.percent * 0.08, t("packaging")); }
        );
        setStatus(99, t("generating"));
        var zipName = engine.sanitizeFilename(options.filename || config.defaults.filename);
        if (!/\.zip$/i.test(zipName)) zipName += ".zip";
        downloadBlob(archive, zipName);
        toast(t("downloadedZip", { name: zipName }));
      } else {
        for (var d = 0; d < results.length; d++) {
          setStatus(90 + ((d + 1) / results.length) * 9, t("downloading"));
          downloadBlob(results[d].blob, results[d].name);
          await wait(300);
        }
        toast(t("downloadedMany", { n: results.length }));
      }
      setStatus(100, t("done"));
      els.statusDetail.textContent = resultSummary(results, queue.length);
    }).catch(function (error) {
      setStatus(0, t("failed"));
      els.statusDetail.textContent = error && error.message === "none" ? t("noConvertible") : t("convertFailed");
      toast(els.statusDetail.textContent, true);
    }).then(function () {
      setBusy(false);
      statusHideTimer = setTimeout(function () {
        if (!busy) hideStatus();
      }, 5200);
    });
  }

  function clearDropHighlight() {
    dragDepth = 0;
    els.dropzone.classList.remove("dragover");
  }

  function wireDropzone() {
    els.dropzone.addEventListener("click", function () {
      if (!busy) els.fileInput.click();
    });
    els.dropzone.addEventListener("keydown", function (event) {
      if ((event.key === "Enter" || event.key === " ") && !busy) {
        event.preventDefault();
        els.fileInput.click();
      }
    });
    els.fileInput.addEventListener("change", function () {
      addFiles(els.fileInput.files);
      els.fileInput.value = "";
    });
    els.dropzone.addEventListener("dragenter", function (event) {
      event.preventDefault();
      if (busy) return;
      dragDepth += 1;
      els.dropzone.classList.add("dragover");
    });
    els.dropzone.addEventListener("dragover", function (event) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = busy ? "none" : "copy";
    });
    els.dropzone.addEventListener("dragleave", function (event) {
      event.preventDefault();
      dragDepth -= 1;
      if (dragDepth <= 0) clearDropHighlight();
    });
    els.dropzone.addEventListener("drop", function (event) {
      event.preventDefault();
      clearDropHighlight();
      if (!busy && event.dataTransfer && event.dataTransfer.files) addFiles(event.dataTransfer.files);
    });
    global.addEventListener("dragover", function (event) { event.preventDefault(); });
    global.addEventListener("drop", function (event) { event.preventDefault(); });
  }

  function wireControls() {
    els.langZh.addEventListener("click", function () { setLanguage("zh"); });
    els.langEn.addEventListener("click", function () { setLanguage("en"); });
    els.themeToggle.addEventListener("click", toggleTheme);
    if (global.matchMedia) {
      var themePreference = global.matchMedia("(prefers-color-scheme: dark)");
      var followSystemTheme = function () {
        try {
          if (!localStorage.getItem(config.storageKeys.appearance)) applyTheme(systemTheme(), false);
        } catch (error) {
          applyTheme(systemTheme(), false);
        }
      };
      if (themePreference.addEventListener) themePreference.addEventListener("change", followSystemTheme);
    }
    els.btnClear.addEventListener("click", clearAll);
    els.btnConvert.addEventListener("click", processAll);
    els.optFormat.addEventListener("change", handleOptionChange);
    els.optQuality.addEventListener("input", handleOptionChange);
    els.optMaxEdge.addEventListener("change", handleOptionChange);
    els.optMaxEdge.addEventListener("input", function () {
      updateActivePreset();
      scheduleSettingsSave();
    });
    els.optZip.addEventListener("change", handleOptionChange);
    els.optKeepName.addEventListener("change", handleOptionChange);
    els.optFilename.addEventListener("input", scheduleSettingsSave);
    global.addEventListener("beforeunload", function () { items.forEach(releasePreview); });
  }

  function cacheElements() {
    [
      "main", "dropzone", "fileInput", "presetList", "optFormat", "optQuality", "qualityValue",
      "qualityField", "qualityHelp", "formatHelp", "optMaxEdge", "optZip", "optKeepName",
      "optFilename", "zipNameField", "fileList", "fileCount", "totalSize", "emptyState",
      "btnClear", "btnConvert", "btnCount", "actionHint", "statusPanel", "statusText",
      "statusPct", "statusDetail", "progressTrack", "progressBar", "langZh", "langEn", "themeToggle",
      "workflowSteps", "btnConvertLabel"
    ].forEach(function (id) { els[id] = $(id); });

    els.toast = document.createElement("div");
    els.toast.className = "toast";
    els.toast.setAttribute("role", "status");
    els.toast.setAttribute("aria-live", "polite");
    document.body.appendChild(els.toast);
  }

  function init() {
    cacheElements();
    applyTheme(loadTheme(), false);
    renderFormatOptions();
    applySettings(loadSettings());
    applyStaticI18n();
    renderPresets();
    wireControls();
    wireDropzone();
    syncControlPresentation();
    renderList();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
