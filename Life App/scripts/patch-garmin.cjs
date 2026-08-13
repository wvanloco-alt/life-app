// Adds diagnostic logging to garmin-connect-client so Railway logs show
// the raw Garmin SSO response when login is attempted.
// This helps debug auth issues without needing to reproduce locally.

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

// Patch: add locked-account detection from the JS variable Garmin embeds in the page.
// Garmin's error page sets `var status = "ACCOUNT_LOCKED"` in JS, not in an HTML element,
// so the library's extractErrorMessage() misses it. We detect it before parseSsoPostResponse
// runs so the library can surface a meaningful "AccountLocked" error.
const authServiceTarget = path.join(
  __dirname,
  "../node_modules/garmin-connect-client/dist/authentication-service.js"
);

if (fs.existsSync(authServiceTarget)) {
  let authService = fs.readFileSync(authServiceTarget, "utf8");
  const needle = /const result = \(0, auth_html_parser_1\.parseSsoPostResponse\)\(postHtml\);/g;
  const replacement = `
            // ponytail: detect Garmin's ACCOUNT_LOCKED status embedded as a JS var in the SSO page.
            if (/var\\s+status\\s*=\\s*"ACCOUNT_LOCKED"/i.test(postHtml)) {
              throw new errors_1.AuthenticationError("Your Garmin account is temporarily locked. Log in at connect.garmin.com to unlock it.");
            }
            const result = (0, auth_html_parser_1.parseSsoPostResponse)(postHtml);`;

  const patched = authService.replace(needle, replacement);
  if (patched !== authService) {
    fs.writeFileSync(authServiceTarget, patched, "utf8");
    console.log("patch-garmin: added ACCOUNT_LOCKED detection to authentication-service.js");
  } else {
    console.log("patch-garmin: authentication-service.js already patched or pattern not found — skipping.");
  }
}
