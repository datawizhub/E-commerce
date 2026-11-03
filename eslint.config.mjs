import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".next-*/**",
    ".pnpm-store/**",
    ".cache/**",
    "test-results/**",
    ".impeccable/review/**",
  ]),
  {files:['src/lib/supabase/database.types.ts'],rules:{'@typescript-eslint/no-empty-object-type':'off'}},
]);
