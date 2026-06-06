import assert from "node:assert/strict";
import { createRequire } from "node:module";
import Module from "node:module";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const projectRoot = process.cwd();
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      path.join(projectRoot, request.slice(2)),
      parent,
      isMain,
      options
    );
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypescript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      strict: true,
    },
  });

  module._compile(compiled.outputText, filename);
};

const {
  STAFF_INVITE_EXPIRY_DAYS,
  STAFF_MIN_PASSWORD_LENGTH,
  buildStaffPasswordEmail,
  buildStaffSetupEmail,
  getStaffInviteExpiryDate,
  normalizeStaffInviteEmail,
  normalizeStaffInviteRole,
  normalizeStaffInviteText,
  validateStaffPassword,
} = require(path.join(projectRoot, "lib", "staff-invitations.ts"));

assert.equal(normalizeStaffInviteEmail("  STAFF@Example.COM "), "staff@example.com");
assert.equal(normalizeStaffInviteText("  Site notes  "), "Site notes");
assert.equal(normalizeStaffInviteRole("Manager"), "Manager");
assert.equal(normalizeStaffInviteRole("Admin"), "Staff");
assert.equal(normalizeStaffInviteRole("Operator"), "Manager");
assert.equal(
  validateStaffPassword("short"),
  `Password must be at least ${STAFF_MIN_PASSWORD_LENGTH} characters.`
);
assert.equal(validateStaffPassword("long-enough"), "");

const now = new Date("2026-06-06T10:00:00.000Z");
const expiryDate = getStaffInviteExpiryDate(now);
assert.equal(expiryDate.toISOString(), "2026-06-13T10:00:00.000Z");
assert.equal(STAFF_INVITE_EXPIRY_DAYS, 7);

const setupEmail = buildStaffSetupEmail({
  staffName: "Alex",
  workspaceName: "RoundHQ Demo",
  setupLink: "https://app.roundhq.co.uk/staff-setup?token=abc",
  expiresAt: "13/06/2026",
});
assert.match(setupEmail, /Alex/);
assert.match(setupEmail, /RoundHQ Demo/);
assert.match(setupEmail, /staff-setup\?token=abc/);
assert.doesNotMatch(setupEmail, /Password:/);

const passwordEmail = buildStaffPasswordEmail({
  staffName: "Alex",
  workspaceName: "RoundHQ Demo",
  loginUrl: "https://app.roundhq.co.uk/login?next=%2Fdashboard",
  email: "alex@example.com",
  temporaryPassword: "password-123",
});
assert.match(passwordEmail, /alex@example\.com/);
assert.match(passwordEmail, /password-123/);
assert.match(passwordEmail, /login\?next=%2Fdashboard/);

console.log("Staff invitation tests passed.");
