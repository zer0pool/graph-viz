const fs = require("fs");
const path = require("path");

const templatePath = path.resolve(__dirname, "../../public/config.template.js");
const outputPath = path.resolve(__dirname, "../../public/config.js");

/**
 * Default configuration values for local development.
 * These match the overrides previously in webpack.config.js.
 */
const defaults = {
  BASE_URL: "/admin-console",
  ENABLE_LINEAGE_MFE: "true",
  ENABLE_CATALOG_MFE: "true",
  LINEAGE_MFE_URL: "http://localhost:5101/remoteEntry.js",
  CATALOG_MFE_URL: "http://localhost:5102/remoteEntry.js",
  ENABLE_AUTH: "false",
  BACKEND_HOST: "http://localhost:5003",
  OIDC_AUTHORITY: "https://accounts.google.com",
  OIDC_RESPONSE_TYPE: "code id_token",
  OIDC_SCOPE: "openid profile email",
};

try {
  if (!fs.existsSync(templatePath)) {
    console.error(`[Config] Template not found at: ${templatePath}`);
    process.exit(1);
  }

  let content = fs.readFileSync(templatePath, "utf8");

  // Replace known variables with process.env or defaults
  Object.keys(defaults).forEach((key) => {
    const val = process.env[key] || defaults[key];
    const regex = new RegExp(`\\\${${key}}`, "g");
    content = content.replace(regex, val);
  });

  // Replace any remaining placeholders (OIDC etc.) with env or empty string
  const remaining = content.match(/\${[A-Z0-9_]+}/g);
  if (remaining) {
    remaining.forEach((match) => {
      const key = match.substring(2, match.length - 1);
      const val = process.env[key] || "";
      const regex = new RegExp(`\\\${${key}}`, "g");
      content = content.replace(regex, val);
    });
  }

  fs.writeFileSync(outputPath, content);
  console.log(`[Config] Success: Created public/config.js from template (Local Dev)`);
} catch (err) {
  console.error(`[Config] Fatal Error: ${err.message}`);
  process.exit(1);
}
