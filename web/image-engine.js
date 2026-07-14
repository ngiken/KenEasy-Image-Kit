/* KenEasy Image Kit — image processing and naming domain layer. */
(function (global) {
  "use strict";

  function createEngine(config) {
    var formats = config.formats;

    function formatBytes(bytes) {
      var value = Number(bytes) || 0;
      if (value < 1024) return value + " B";
      if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";
      if (value < 1024 * 1024 * 1024) return (value / (1024 * 1024)).toFixed(2) + " MB";
      return (value / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }

    function sanitizeFilename(name) {
      return String(name || "")
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, config.limits.maxFilenameLength) || "image";
    }

    function baseName(name) {
      return String(name || "").replace(/\.[^./\\]+$/, "");
    }

    function extensionFromName(name) {
      var match = /\.([a-z0-9]+)$/i.exec(name || "");
      return match ? match[1].toLowerCase() : "";
    }

    function mimeFromItem(item) {
      var mime = String(item.file.type || "").toLowerCase();
      if (formats[mime]) return mime;
      var extension = extensionFromName(item.name);
      if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
      if (extension === "png") return "image/png";
      if (extension === "webp") return "image/webp";
      if (extension === "gif") return "image/gif";
      if (extension === "bmp") return "image/bmp";
      return "";
    }

    function isImageFile(file) {
      if (!file) return false;
      var mime = String(file.type || "").toLowerCase();
      if (config.input.mimeTypes.indexOf(mime) >= 0) return true;
      return config.input.accept.indexOf(extensionFromName(file.name)) >= 0;
    }

    function outputPlan(item, options) {
      if (options.format !== "original") {
        return { mode: "encode", type: options.format, fallback: false };
      }

      var sourceType = mimeFromItem(item);
      var sourceRule = formats[sourceType];
      if (sourceRule && sourceRule.passthroughOnly) {
        if (!options.maxEdge) {
          return { mode: "passthrough", type: sourceType, fallback: false };
        }
        return { mode: "encode", type: "image/png", fallback: true };
      }

      if (sourceRule && !sourceRule.passthroughOnly) {
        return { mode: "encode", type: sourceType, fallback: false };
      }

      return { mode: "encode", type: "image/png", fallback: true };
    }

    function loadImage(item) {
      return new Promise(function (resolve, reject) {
        var temporaryUrl = null;
        var sourceUrl = item.previewUrl;
        if (!sourceUrl) {
          try {
            temporaryUrl = URL.createObjectURL(item.file);
            sourceUrl = temporaryUrl;
          } catch (error) {
            reject(createError("decode", error));
            return;
          }
        }
        var image = new Image();
        image.onload = function () {
          resolve({ image: image, temporaryUrl: temporaryUrl });
        };
        image.onerror = function () {
          if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
          reject(createError("decode"));
        };
        image.src = sourceUrl;
      });
    }

    function createError(code, cause) {
      var error = new Error(code);
      error.code = code;
      error.cause = cause;
      return error;
    }

    function canvasToBlob(canvas, type, quality) {
      return new Promise(function (resolve, reject) {
        function verify(blob) {
          if (!blob) {
            reject(createError("encode"));
            return;
          }
          if (blob.type && blob.type !== type) {
            reject(createError("unsupported-output"));
            return;
          }
          resolve(blob);
        }

        if (canvas.toBlob) {
          canvas.toBlob(verify, type, quality);
          return;
        }

        try {
          var dataUrl = canvas.toDataURL(type, quality);
          var parts = dataUrl.split(",");
          var bytes = atob(parts[1]);
          var array = new Uint8Array(bytes.length);
          for (var i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
          verify(new Blob([array], { type: type }));
        } catch (error) {
          reject(createError("encode", error));
        }
      });
    }

    function calculateTargetSize(width, height, maxEdge) {
      var scale = 1;
      if (maxEdge > 0) {
        var longest = Math.max(width, height);
        if (longest > maxEdge) scale = maxEdge / longest;
      }
      var targetWidth = Math.max(1, Math.round(width * scale));
      var targetHeight = Math.max(1, Math.round(height * scale));
      if (
        targetWidth > config.limits.maxOutputEdge ||
        targetHeight > config.limits.maxOutputEdge ||
        targetWidth * targetHeight > config.limits.maxOutputPixels
      ) {
        throw createError("canvas-limit");
      }
      return { width: targetWidth, height: targetHeight };
    }

    function process(item, options) {
      var plan = outputPlan(item, options);
      if (plan.mode === "passthrough") {
        return Promise.resolve({
          blob: item.file,
          type: plan.type,
          width: item.width || 0,
          height: item.height || 0,
          passthrough: true,
          fallback: false,
        });
      }

      return loadImage(item).then(function (loaded) {
        var image = loaded.image;
        var width = image.naturalWidth || image.width;
        var height = image.naturalHeight || image.height;
        try {
          if (!width || !height) throw createError("decode");
          if (!item.width) {
            item.width = width;
            item.height = height;
          }
          var target = calculateTargetSize(width, height, options.maxEdge);
          var canvas = document.createElement("canvas");
          canvas.width = target.width;
          canvas.height = target.height;
          var context = canvas.getContext("2d");
          if (!context) throw createError("encode");
          if (plan.type === "image/jpeg") {
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, target.width, target.height);
          }
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = "high";
          context.drawImage(image, 0, 0, target.width, target.height);
          var quality = formats[plan.type] && formats[plan.type].quality ? options.quality : undefined;
          return canvasToBlob(canvas, plan.type, quality).then(function (blob) {
            return {
              blob: blob,
              type: plan.type,
              width: target.width,
              height: target.height,
              passthrough: false,
              fallback: plan.fallback,
            };
          });
        } finally {
          if (loaded.temporaryUrl) URL.revokeObjectURL(loaded.temporaryUrl);
        }
      });
    }

    function outputName(item, type, keepName, index, usedNames) {
      var rule = formats[type];
      var extension = rule ? rule.extension : "img";
      var base = keepName ? baseName(item.name) : "image-" + (index + 1);
      base = sanitizeFilename(base);
      var name = base + "." + extension;
      if (usedNames) {
        var suffix = 1;
        while (usedNames[name.toLowerCase()]) {
          suffix += 1;
          name = base + "-" + suffix + "." + extension;
        }
        usedNames[name.toLowerCase()] = true;
      }
      return name;
    }

    function formatUsesQuality(format) {
      if (format === "original") return true;
      return !!(formats[format] && formats[format].quality);
    }

    return {
      formatBytes: formatBytes,
      sanitizeFilename: sanitizeFilename,
      extensionFromName: extensionFromName,
      mimeFromItem: mimeFromItem,
      isImageFile: isImageFile,
      outputPlan: outputPlan,
      outputName: outputName,
      process: process,
      formatUsesQuality: formatUsesQuality,
    };
  }

  global.KenEasyImageEngine = { create: createEngine };
})(window);
