import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/catalog-browser",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3002",
    channel: process.platform === "win32" ? "msedge" : undefined,
    trace: "retain-on-failure",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node scripts/catalog-test-server.mjs",
      url: "http://127.0.0.1:54329/health",
      reuseExistingServer: false,
    },
    {
      command:
        "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3002",
      url: "http://127.0.0.1:3002",
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        NEXT_PUBLIC_STORE_MODE: "backend",
        NEXT_DIST_DIR: ".next-integration",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-test-only",
      },
    },
  ],
});
