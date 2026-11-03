import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/backend",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: process.platform === "win32" ? "msedge" : undefined,
    trace: "retain-on-failure",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
});
