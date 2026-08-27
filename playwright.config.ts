import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e', timeout:30_000, fullyParallel:false,
  webServer:{command:'npm run build && npm start',url:'http://localhost:3000/api/health',reuseExistingServer:true,timeout:120_000},
  use:{baseURL:'http://127.0.0.1:3000',trace:'retain-on-failure'},
  projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'tablet',use:{...devices['iPad (gen 7)']}}],
});
