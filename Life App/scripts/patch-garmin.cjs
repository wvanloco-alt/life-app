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
// The compiled JS uses the full module reference pattern.
let patched = original.replace(
  /if \(title && \/mfa\/i\.test\(title\)\)/g,
  'if (title && (/mfa/i.test(title) || /authentication application/i.test(title)))'
);

// Patch 2: log the raw credentials-POST HTML response before it is parsed,
// so we can see exactly what Garmin is returning in Railway logs.
const authServiceTarget = path.join(
  __dirname,
  "../node_modules/garmin-connect-client/dist/authentication-service.js"
);

if (fs.existsSync(authServiceTarget)) {
  let authService = fs.readFileSync(authServiceTarget, "utf8");
  const logPatch = authService.replace(
    /const result = \(0, auth_html_parser_1\.parseSsoPostResponse\)\(postHtml\);/g,
    `console.error('[garmin-debug] raw SSO post response (first 3000 chars):', postHtml.substring(0, 3000));\n            const result = (0, auth_html_parser_1.parseSsoPostResponse)(postHtml);`
  );
  if (logPatch !== authService) {
    fs.writeFileSync(authServiceTarget, logPatch, "utf8");
    console.log("patch-garmin: added raw HTML logging before parseSsoPostResponse.");
  }
}

if (patched === original) {
  console.log("patch-garmin: already patched or pattern not found — skipping.");
} else {
  fs.writeFileSync(target, patched, "utf8");
  console.log("patch-garmin: patched garmin-connect-client MFA detection.");
}
