/* KenEasy Image Kit — declarative product rules and defaults. */
(function (global) {
  "use strict";

  var config = {
    version: "0.3.1",
    storageKeys: {
      language: "keneasy-imagekit-lang",
      appearance: "keneasy-imagekit-appearance",
      settings: "keneasy-imagekit-settings-v2",
    },
    limits: {
      maxFiles: 120,
      maxFileBytes: 40 * 1024 * 1024,
      maxOutputEdge: 16384,
      maxOutputPixels: 64 * 1000 * 1000,
      maxFilenameLength: 120,
    },
    input: {
      accept: ["png", "jpg", "jpeg", "webp", "gif", "bmp"],
      mimeTypes: [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
        "image/bmp",
      ],
    },
    formats: {
      "image/webp": { extension: "webp", quality: true, label: "WebP" },
      "image/jpeg": { extension: "jpg", quality: true, label: "JPEG" },
      "image/png": { extension: "png", quality: false, label: "PNG" },
      "image/gif": { extension: "gif", quality: false, label: "GIF", passthroughOnly: true },
      "image/bmp": { extension: "bmp", quality: false, label: "BMP", passthroughOnly: true },
    },
    outputOptions: [
      { value: "image/webp", label: "WebP", helpKey: "formatHelpWebp" },
      { value: "image/jpeg", label: "JPEG", helpKey: "formatHelpJpeg" },
      { value: "image/png", label: "PNG", helpKey: "formatHelpPng" },
      { value: "original", labelKey: "formatOriginal", helpKey: "formatHelpOriginal" },
    ],
    controls: {
      quality: { min: 0.1, max: 1, step: 0.01 },
      maxEdge: { min: 0, max: 20000, step: 10 },
    },
    defaults: {
      format: "original",
      quality: 0.82,
      maxEdge: 0,
      zip: false,
      keepName: true,
      filename: "images",
    },
    presets: [
      {
        id: "balanced",
        nameKey: "presetBalanced",
        descKey: "presetBalancedDesc",
        values: { format: "image/webp", quality: 0.82, maxEdge: 0 },
      },
      {
        id: "smaller",
        nameKey: "presetSmaller",
        descKey: "presetSmallerDesc",
        values: { format: "image/webp", quality: 0.5, maxEdge: 0 },
      },
      {
        id: "quality",
        nameKey: "presetQuality",
        descKey: "presetQualityDesc",
        values: { format: "image/webp", quality: 0.92, maxEdge: 0 },
      },
      {
        id: "social",
        nameKey: "presetSocial",
        descKey: "presetSocialDesc",
        values: { format: "image/webp", quality: 0.82, maxEdge: 1080 },
      },
    ],
  };

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return value;
  }

  global.KenEasyImageKitConfig = deepFreeze(config);
})(window);
