const fs = require("node:fs");
const path = require("node:path");

// This file used to rewrite the admin route at runtime and could silently
// restore localhost/Laravel proxies plus db.json fallbacks. Keep the legacy
// filename for existing local workflows, but make it a read-only audit.
const target = path.join(__dirname, "../app/api/admin/[...slug]/route.js");
const source = fs.readFileSync(target, "utf8");
const requiredFastApiRoutes = [
  "/api/v1/admin/overview",
  "/api/v1/admin/search",
  "/api/v1/admin/users",
  "/api/v1/admin/owner-verifications",
];
const missing = requiredFastApiRoutes.filter((route) => !source.includes(route));

if (missing.length) {
  console.error(`FastAPI route audit failed; missing: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("FastAPI admin routes are present. No files were modified.");
}

if (/127\.0\.0\.1:8000|NEXT_PUBLIC_API_URL|admin\/bff\/load-all/.test(source)) {
  console.warn(
    "Legacy admin proxy/fallback code remains intentionally; do not remove until endpoint parity and rollback checks pass."
  );
}
