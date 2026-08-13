// Patches garmin-connect-client's MFA title detection to also handle
// email-based MFA, which uses the page title "GARMIN Authentication Application"
// instead of a title containing "MFA".
// See: https://github.com/orpjones/garmin-connect-client (auth-html-parser.ts)

const fs = require("fs");
const path = require("path");

const target = path.join(
  __dirname,
  "../node_modules/garmin-connect-client/dist/auth-html-parser.js"
);

if (!fs.existsSync(target)) {
  // Package not installed (e.g. Windows dev environment) — skip silently.
  process.exit(0);
}

const original = fs.readFileSync(target, "utf8");

const patched = original.replace(
  /\/mfa\/i\.test\(title\)/g,
  '/mfa/i.test(title) || /authentication application/i.test(title)'
);

if (patched === original) {
  console.log("patch-garmin: already patched or pattern not found — skipping.");
} else {
  fs.writeFileSync(target, patched, "utf8");
  console.log("patch-garmin: patched garmin-connect-client MFA detection.");
}
