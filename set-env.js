const fs = require("fs");
const path = require("path");

const environmentPath = path.join(
  __dirname,
  "src",
  "environments",
  "environment.ts",
);

const envContent = `export const environment = {
  production: true,
  supabaseUrl: '${process.env.SUPABASE_URL || "YOUR_SUPABASE_URL_NOT_FOUND"}',
  supabaseKey: '${process.env.SUPABASE_KEY || "YOUR_SUPABASE_ANON_KEY_NOT_FOUND"}',
};
`;

fs.writeFileSync(environmentPath, envContent);

console.log(`Successfully generated environment file at ${environmentPath}`);
