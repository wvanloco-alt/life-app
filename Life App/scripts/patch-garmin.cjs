// Patches to garmin-connect-client:
// 1. ACCOUNT_LOCKED detection in the SSO auth flow
// 2. Coerce unknown activityType.typeKey values (e.g. tennis_v2) to "other"
//    instead of throwing a ZodError — Garmin adds _v2 variants over time.

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

// Patch 2: make ActivityTypeKeySchema coerce unknown values to "other".
// Garmin introduces _v2 variants (tennis_v2, kayaking_v2, etc.) that aren't in
// the library's Zod enum. Adding .catch("other") makes the schema accept any string.
const indexTarget = path.join(
  __dirname,
  "../node_modules/garmin-connect-client/dist/index.js"
);

if (fs.existsSync(indexTarget)) {
  let indexJs = fs.readFileSync(indexTarget, "utf8");
  // The compiled enum export looks like: exports.ActivityTypeKeySchema = z_1.z.enum([...]);
  // We append .catch("other") so unknown typeKeys fall through gracefully.
  const typeKeyPatch = indexJs.replace(
    /(exports\.ActivityTypeKeySchema\s*=\s*[^;]+);/,
    "$1.catch(\"other\");"
  );
  if (typeKeyPatch !== indexJs) {
    fs.writeFileSync(indexTarget, typeKeyPatch, "utf8");
    console.log("patch-garmin: patched ActivityTypeKeySchema to coerce unknown typeKeys to 'other'.");
  } else {
    console.log("patch-garmin: ActivityTypeKeySchema already patched or pattern not found — skipping.");
  }
}

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
