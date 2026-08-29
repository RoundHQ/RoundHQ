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
  CUSTOMER_FEATURES,
  getDefaultCustomerFeatureAccess,
  normalizeCustomerFeatureAccess,
} = require(path.join(projectRoot, "lib", "customer-features.ts"));
const { isCustomerFeatureEnabled } = require(
  path.join(projectRoot, "lib", "customer-account.ts")
);

const aiAssistantFeature = CUSTOMER_FEATURES.find(
  (feature) => feature.key === "aiReceptionist"
);
assert.equal(aiAssistantFeature?.label, "AI Assistant");
assert.match(aiAssistantFeature?.description ?? "", /keep this off/i);
assert.equal(getDefaultCustomerFeatureAccess().aiReceptionist, false);
assert.equal(normalizeCustomerFeatureAccess({}).aiReceptionist, false);
assert.equal(
  normalizeCustomerFeatureAccess({ aiReceptionist: true }).aiReceptionist,
  true
);

function createSettingsClient(featureAccess) {
  return {
    from(table) {
      assert.equal(table, "customer_account_settings");

      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          return {
            data: {
              account_status: "active",
              disabled_reason: "",
              feature_access: featureAccess,
              internal_notes: "",
              support_priority: "standard",
              updated_at: null,
            },
            error: null,
          };
        },
      };
    },
  };
}

const originalNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = "development";

assert.equal(
  await isCustomerFeatureEnabled(
    createSettingsClient({ aiReceptionist: false }),
    "organization-1",
    "aiReceptionist"
  ),
  false,
  "development must not bypass the customer feature checkbox"
);
assert.equal(
  await isCustomerFeatureEnabled(
    createSettingsClient({ aiReceptionist: true }),
    "organization-1",
    "aiReceptionist"
  ),
  true,
  "an explicit admin opt-in should enable the feature"
);

if (originalNodeEnv === undefined) {
  delete process.env.NODE_ENV;
} else {
  process.env.NODE_ENV = originalNodeEnv;
}

const dashboardSource = fs.readFileSync(
  path.join(projectRoot, "app", "dashboard", "page.tsx"),
  "utf8"
);
assert.doesNotMatch(
  dashboardSource,
  /NODE_ENV\s*===\s*["']development["']/,
  "the dashboard must not reveal AI Assistant controls in development"
);

const manualCustomerSource = fs.readFileSync(
  path.join(projectRoot, "app", "admin", "customers", "actions.ts"),
  "utf8"
);
assert.match(manualCustomerSource, /feature_access:\s*getDefaultCustomerFeatureAccess\(\)/);
assert.doesNotMatch(manualCustomerSource, /feature_access:\s*getPlanFeatureAccess\(/);

const jobsAppSource = fs.readFileSync(
  path.join(projectRoot, "components", "jobs-app.tsx"),
  "utf8"
);
assert.match(
  jobsAppSource,
  /showAiAssistantDetails=\{\s*customerFeatureAccess\.aiReceptionist\s*\}/
);

const leadsPageSource = fs.readFileSync(
  path.join(projectRoot, "components", "jobs", "customer-leads-page.tsx"),
  "utf8"
);
assert.match(leadsPageSource, /showAiAssistantDetails \? "Voicemail" : "Phone"/);
assert.match(leadsPageSource, /entry\.type !== "ai_receptionist_call"/);

const migrationSource = fs.readFileSync(
  path.join(projectRoot, "supabase", "ai_assistant_feature_access.sql"),
  "utf8"
);
assert.match(migrationSource, /'\{aiReceptionist\}'/);
assert.match(migrationSource, /'false'::jsonb/);

console.log("Customer AI Assistant feature-access tests passed.");
