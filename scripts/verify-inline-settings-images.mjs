import assert from "node:assert/strict";

import {
  InlineSettingsImageError,
  materializeInlineSettingsImages,
} from "../lib/inline-settings-images.mjs";

const pngA =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=";
const pngB =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const calls = [];
const upload = async (value, field) => {
  calls.push({ value, field });
  return `https://blob.example.test/${calls.length}.png`;
};

const payload = {
  appName: "CariKostKita",
  logoUrl: pngA,
  logo_url: pngA,
  popupImageUrl: pngB,
  popup_image_url: pngB,
  nested: {
    heroImageUrl: pngA,
    untouched: "data:text/plain;base64,aGVsbG8=",
  },
  faqItems: [
    { id: "faq-1", question: "Tetap utuh?", answer: "Ya." },
  ],
};

const result = await materializeInlineSettingsImages(payload, { upload });

assert.equal(result.uploadedImages, 2, "duplicate aliases should upload once");
assert.equal(calls.length, 2, "only two unique images should be uploaded");
assert.equal(result.migratedFields.length, 5, "all inline image paths should be reported");
assert.equal(result.payload.logoUrl, "https://blob.example.test/1.png");
assert.equal(result.payload.logo_url, result.payload.logoUrl);
assert.equal(result.payload.popupImageUrl, "https://blob.example.test/2.png");
assert.equal(result.payload.popup_image_url, result.payload.popupImageUrl);
assert.equal(result.payload.nested.heroImageUrl, result.payload.logoUrl);
assert.equal(result.payload.nested.untouched, "data:text/plain;base64,aGVsbG8=");
assert.equal(result.payload.appName, "CariKostKita");
assert.deepEqual(result.payload.faqItems, payload.faqItems);
assert.ok(!JSON.stringify(result.payload).includes("data:image/"), "no inline image may remain");

const untouched = await materializeInlineSettingsImages(
  { appName: "Tanpa Gambar", logoUrl: "https://cdn.example.test/logo.png" },
  { upload }
);
assert.equal(untouched.uploadedImages, 0);
assert.equal(untouched.migratedFields.length, 0);

await assert.rejects(
  materializeInlineSettingsImages(
    { logoUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" },
    { upload }
  ),
  (error) =>
    error instanceof InlineSettingsImageError &&
    error.status === 400 &&
    error.fields.includes("logoUrl")
);

console.log("verify:inline-images OK (dedupe, replacement, unsupported format)");
