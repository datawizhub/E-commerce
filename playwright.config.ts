import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  // These journeys compile several development routes on a cold Windows server.
  timeout: 90000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://127.0.0.1:3001",
    channel: process.platform === "win32" ? "msedge" : undefined,
    trace: "retain-on-failure",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command:
      "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3001",
    url: "http://127.0.0.1:3001",
    env: { NEXT_PUBLIC_STORE_MODE: "demo", NEXT_DIST_DIR: ".next-demo" },
    reuseExistingServer: true,
    timeout: 120000,
  },
});
