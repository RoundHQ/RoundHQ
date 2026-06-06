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
  canAccessAdminSettings,
  canAccessBilling,
  canAccessOperationalScreens,
  canAccessStaffPageKey,
  canAccessTechnicianMode,
  canManageTeam,
  getAllowedStaffPageKeys,
  normalizeStaffRole,
} = require(path.join(projectRoot, "lib", "team-permissions.ts"));

assert.equal(normalizeStaffRole("Admin"), "Admin");
assert.equal(normalizeStaffRole("Manager"), "Manager");
assert.equal(normalizeStaffRole("Staff"), "Staff");
assert.equal(normalizeStaffRole("Operator"), "Manager");
assert.equal(normalizeStaffRole("unknown"), "Staff");

assert.equal(canAccessBilling("Admin"), true, "admin should access billing");
assert.equal(canAccessBilling("Manager"), false, "manager should not access billing");
assert.equal(canAccessBilling("Staff"), false, "staff should not access billing");

assert.equal(canManageTeam("Admin"), true, "admin should manage team");
assert.equal(canManageTeam("Manager"), false, "manager should not manage team");
assert.equal(canManageTeam("Staff"), false, "staff should not manage team");

assert.equal(
  canAccessOperationalScreens("Manager"),
  true,
  "manager should access operational screens"
);
assert.equal(
  canAccessOperationalScreens("Staff"),
  false,
  "staff should not access operational screens"
);
assert.equal(
  canAccessTechnicianMode("Staff"),
  true,
  "staff should be able to open technician mode"
);
assert.equal(
  canAccessTechnicianMode("Manager"),
  true,
  "manager can open technician mode when assigned"
);

const staffPages = getAllowedStaffPageKeys("Staff");
assert.deepEqual([...staffPages], ["technician"], "staff access should be technician-only");
assert.equal(
  canAccessStaffPageKey("Staff", "dashboard", staffPages),
  false,
  "staff cannot open dashboard without the permission"
);
assert.equal(
  canAccessStaffPageKey("Staff", "technician", staffPages),
  true,
  "staff can open technician mode"
);

const expandedStaffPages = getAllowedStaffPageKeys("Staff", [
  "dashboard",
  "customers",
  "technician",
]);
assert.deepEqual(
  [...expandedStaffPages],
  ["dashboard", "customers", "technician"],
  "staff access should follow selected role permissions"
);
assert.equal(
  canAccessStaffPageKey("Staff", "dashboard", expandedStaffPages),
  true,
  "staff can open dashboard when selected"
);

const managerPages = getAllowedStaffPageKeys("Manager", ["dashboard", "schedule"]);
assert.equal(
  canAccessStaffPageKey("Manager", "dashboard", managerPages),
  true,
  "manager can open allowed operational pages"
);
assert.equal(
  canAccessStaffPageKey("Manager", "settings", managerPages),
  false,
  "manager cannot open admin-only settings"
);
assert.equal(
  canAccessAdminSettings("Manager"),
  false,
  "manager should not access admin settings"
);

console.log("Team permission tests passed.");
