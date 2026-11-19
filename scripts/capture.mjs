import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
await mkdir('docs/screenshots', { recursive: true });
await page.goto('http://localhost:3000');
await page.getByRole('button', { name: 'Add Arc table lamp to cart' }).waitFor();
await page.screenshot({
  path: 'docs/screenshots/storefront.png',
  fullPage: true,
});
await page.getByRole('button', { name: 'Add Arc table lamp to cart' }).click();
await page.getByRole('button', { name: 'Add Form ceramic vase to cart' }).click();
await page.getByRole('link', { name: /Shopping cart/ }).click();
await page.getByLabel('Full name').fill('Alex Morgan');
await page.getByLabel('Delivery address').fill('24 Willow Lane, Fictional City');
await page.screenshot({
  path: 'docs/screenshots/checkout.png',
  fullPage: true,
});
// Capture stable staff screens after the success notices have disappeared.
const staff = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const workspace = await staff.newPage();
const oncall = process.env.ONCALL_TOKEN || 'oncall-demo-local';
const diagnostic = await staff.request.get('http://localhost:3000/api/staff/operations', {
  headers: { Authorization: `Bearer ${oncall}` },
});
if (!diagnostic.ok()) throw new Error('On-call diagnostics unavailable');
const state = await diagnostic.json();
const recovered = state.jobs.find(
  (j) => j.kind === 'ship' && j.state === 'succeeded' && j.recovery_count > 0,
);
if (!recovered) throw new Error('Run the failure/recovery browser journey before capturing staff evidence');
await workspace.goto('http://localhost:3000/operations');
await workspace.getByLabel('Staff token').fill(oncall);
await workspace.getByRole('button', { name: 'Open workspace' }).click();
const row = workspace
  .getByRole('row')
  .filter({ hasText: `OF-${recovered.order_id.slice(0, 8).toUpperCase()}` })
  .filter({ hasText: 'Book delivery' });
await row.getByRole('button').click();
await workspace.screenshot({
  path: 'docs/screenshots/recovery.png',
  fullPage: true,
});
await workspace.goto('http://localhost:3000/operator');
await workspace.getByLabel('Staff token').fill(process.env.OPERATOR_TOKEN || 'operator-demo-local');
await workspace.getByRole('button', { name: 'Open workspace' }).click();
await workspace.getByRole('heading', { name: 'Orders at a glance' }).waitFor();
await workspace.screenshot({
  path: 'docs/screenshots/operator.png',
  fullPage: true,
});
await staff.close();
await context.request.post('http://localhost:3001/login', {
  data: {
    user: 'admin',
    password: process.env.GRAFANA_PASSWORD || 'admin-demo-local',
  },
});
await page.goto('http://localhost:3001/d/orderflow?orgId=1&from=now-15m&to=now');
await page.getByText('Integration outcomes / second', { exact: true }).waitFor();
await page.waitForTimeout(5000);
await page.screenshot({
  path: 'docs/screenshots/monitoring.png',
  fullPage: false,
});
const reportRoot = resolve('allure-report');
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    const file = resolve(reportRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(reportRoot + '/')) {
      res.writeHead(403).end();
      return;
    }
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(9393, '127.0.0.1', resolve));
try {
  await page.goto('http://127.0.0.1:9393');
  await page.getByText('test cases', { exact: false }).first().waitFor();
  await page.screenshot({ path: 'docs/screenshots/tests.png', fullPage: true });
} finally {
  server.close();
  await browser.close();
}
