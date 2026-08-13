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

// Patch 1: treat "GARMIN Authentication Application" as MFA (email flow)
let patched = original.replace(
  /\/mfa\/i\.test\(title\)/g,
  '/mfa/i.test(title) || /authentication application/i.test(title)'
);

// Patch 2: log raw HTML to stderr when an unexpected title is encountered,
// so we can inspect what Garmin is actually returning in Railway logs.
const authServiceTarget = path.join(
  __dirname,
  "../node_modules/garmin-connect-client/dist/authentication-service.js"
);

if (fs.existsSync(authServiceTarget)) {
  let authService = fs.readFileSync(authServiceTarget, "utf8");
  // Insert HTML logging before the loginError throw
  const logPatch = authService.replace(
    /throw AuthenticationService\.loginError\(result\);/g,
    `console.error('[garmin-debug] unexpected SSO response title, html snippet:', postHtml.substring(0, 2000));\n        throw AuthenticationService.loginError(result);`
  );
  if (logPatch !== authService) {
    fs.writeFileSync(authServiceTarget, logPatch, "utf8");
    console.log("patch-garmin: added HTML debug logging to authentication-service.");
  }
}

if (patched === original) {
  console.log("patch-garmin: already patched or pattern not found — skipping.");
} else {
  fs.writeFileSync(target, patched, "utf8");
  console.log("patch-garmin: patched garmin-connect-client MFA detection.");
}
