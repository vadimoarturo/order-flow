import { writeFile } from 'node:fs/promises';
import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const oncall = process.env.ONCALL_TOKEN || 'oncall-demo-local',
  operator = process.env.OPERATOR_TOKEN || 'operator-demo-local';
const reason = 'Automated demo test: integration recovery exercise';
async function control(request: APIRequestContext, service: string, available: boolean) {
  const r = await request.post(`/api/staff/services/${service}`, {
    headers: { Authorization: `Bearer ${oncall}` },
    data: { available, reason },
  });
  expect(r.ok()).toBeTruthy();
}
async function login(page: Page, path: string, token: string) {
  await page.goto(path);
  if (await page.getByLabel('Staff token').isVisible()) {
    await page.getByLabel('Staff token').fill(token);
    await page.getByRole('button', { name: 'Open workspace' }).click();
  }
  await expect(page.getByText('Signed in as')).toBeVisible();
}
async function checkout(page: Page, product = 'Arc table lamp') {
  await page.goto('/');
  await page.getByRole('button', { name: `Add ${product} to cart`, exact: true }).click();
  await page.getByRole('link', { name: /Shopping cart/ }).click();
  await page.getByLabel('Full name').fill('Alex Demo');
  await page.getByLabel('Delivery address').fill('24 Willow Lane, Fictional City');
  await page.getByRole('button', { name: 'Place demo order' }).click();
  await expect(page).toHaveURL(/\/orders\/[a-f0-9-]+/);
  await expect(page.getByText('Order received', { exact: true })).toBeVisible();
  return page.url().split('/').pop()!;
}
test('storefront → checkout → delivery → operator completion', async ({ page, request }) => {
  await control(request, 'inventory', true);
  await control(request, 'delivery', true);
  const id = await checkout(page);
  await expect(page.getByText('Delivery arranged', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'docs/screenshots/tracking.png',
    fullPage: true,
  });
  await test.info().attach('tracking screen', {
    path: 'docs/screenshots/tracking.png',
    contentType: 'image/png',
  });
  await login(page, '/operator', operator);
  const row = page.getByRole('row').filter({ hasText: `OF-${id.slice(0, 8).toUpperCase()}` });
  await row.getByRole('button', { name: 'Mark dispatched' }).click();
  await row.getByRole('button', { name: 'Mark completed' }).click();
  await expect(row.getByText('completed', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'docs/screenshots/operator.png',
    fullPage: true,
  });
  await test.info().attach('operator screen', {
    path: 'docs/screenshots/operator.png',
    contentType: 'image/png',
  });
  await page.goto(`/orders/${id}`);
  await expect(page.getByText('At home, at last')).toBeVisible();
});
test('delivery outage → bounded retries → DLQ alert → audited on-call recovery', async ({
  page,
  request,
}) => {
  await control(request, 'inventory', true);
  await control(request, 'delivery', false);
  try {
    const id = await checkout(page, 'Form ceramic vase');
    const extraResponse = await request.post('/api/orders', {
      data: {
        idempotencyKey: randomUUID(),
        customer: 'Demo Skip Exercise',
        address: '32 Fictional Lane',
        items: [{ productId: 'vase', quantity: 1 }],
      },
    });
    expect(extraResponse.ok()).toBeTruthy();
    const extra = await extraResponse.json();
    await expect(page.getByText('Your pieces are reserved', { exact: true })).toBeVisible();
    await expect(page.getByText('Integration needs attention.', { exact: false })).toBeVisible({
      timeout: 70000,
    });
    await login(page, '/operations', oncall);
    const row = page
      .getByRole('row')
      .filter({ hasText: `OF-${id.slice(0, 8).toUpperCase()}` })
      .filter({ hasText: 'Book delivery' });
    await row.getByRole('button').click();
    await expect(page.getByText('503:', { exact: false })).toBeVisible();
    await page.screenshot({
      path: 'docs/screenshots/failure.png',
      fullPage: true,
    });
    await test.info().attach('failure screen', {
      path: 'docs/screenshots/failure.png',
      contentType: 'image/png',
    });
    // Check the real Prometheus rule instead of assuming that a dashboard implies alerting.
    await expect
      .poll(
        async () => {
          const r = await request.get('http://localhost:9090/api/v1/alerts');
          const body = await r.json();
          return body.data.alerts.some(
            (a: any) => a.labels.alertname === 'OrderFlowDeadLetterQueue' && a.state === 'firing',
          );
        },
        { timeout: 30000 },
      )
      .toBeTruthy();
    await expect
      .poll(
        async () => {
          const r = await request.get('/api/staff/operations', {
            headers: { Authorization: `Bearer ${oncall}` },
          });
          const data = await r.json();
          return data.jobs.find((j: any) => j.order_id === extra.id && j.kind === 'ship')?.state;
        },
        { timeout: 15000 },
      )
      .toBe('dlq');
    const diagnostics = await (
      await request.get('/api/staff/operations', {
        headers: { Authorization: `Bearer ${oncall}` },
      })
    ).json();
    const skip = diagnostics.jobs.find((j: any) => j.order_id === extra.id && j.kind === 'ship');
    expect(
      (
        await request.post(`/api/staff/jobs/${skip.id}/retry`, {
          headers: { Authorization: `Bearer ${operator}` },
          data: { reason },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post(`/api/staff/jobs/${skip.id}/skip`, {
          headers: { Authorization: `Bearer ${oncall}` },
          data: {
            reason: 'Demo: acknowledged as requiring manual business resolution',
          },
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await (
          await request.get(`/api/orders/${extra.id}`, {
            headers: { 'x-order-token': extra.trackingToken },
          })
        ).json()
      ).status,
    ).toBe('attention');
    expect(
      (
        await request.post(`/api/staff/jobs/${skip.id}/retry`, {
          headers: { Authorization: `Bearer ${oncall}` },
          data: { reason },
        })
      ).status(),
    ).toBe(409);
    const alerts = await page.context().newPage();
    await alerts.goto('http://localhost:9090/alerts');
    await alerts.getByText('OrderFlowDeadLetterQueue', { exact: false }).first().waitFor();
    await alerts.screenshot({
      path: 'docs/screenshots/alerts.png',
      fullPage: true,
    });
    await alerts.close();
    await page.getByRole('button', { name: 'Restore service' }).click();
    await page.getByRole('button', { name: 'Retry task', exact: true }).click();
    await expect(row.getByText('succeeded', { exact: true })).toBeVisible();
    const state = await (
      await request.get('/api/staff/operations', {
        headers: { Authorization: `Bearer ${oncall}` },
      })
    ).json();
    const task = state.jobs.find((j: any) => j.order_id === id && j.kind === 'ship');
    expect(state.audit.some((a: any) => a.action === 'job.retry' && a.target === task.id)).toBeTruthy();
    await writeFile(
      'test-results/recovery-evidence.json',
      JSON.stringify({ orderId: id, jobId: task.id, traceId: task.trace_id }, null, 2),
    );
    await page.screenshot({
      path: 'docs/screenshots/recovery.png',
      fullPage: true,
    });
    await test.info().attach('recovery screen', {
      path: 'docs/screenshots/recovery.png',
      contentType: 'image/png',
    });
    await page.goto(`/orders/${id}`);
    await expect(page.getByText('Delivery arranged', { exact: true })).toBeVisible();
  } finally {
    await control(request, 'delivery', true);
  }
});
test('authorization, private tracking, idempotency conflict and input validation', async ({ request }) => {
  const auth = { Authorization: `Bearer ${operator}` };
  const health = await (await request.get('/api/health')).json();
  expect(health.mode).toBe('worker');
  expect((await request.get('http://localhost:4001/health')).ok()).toBeTruthy();
  expect((await request.get('http://localhost:4001/products')).status()).toBe(404);
  expect((await request.get('http://localhost:4001/docs-json')).status()).toBe(404);
  const openapi = await (await request.get('http://localhost:4000/docs-json')).json();
  expect(openapi.info.title).toBe('OrderFlow Market API');
  expect((await request.get('/api/staff/orders')).status()).toBe(401);
  expect(
    (
      await request.post('/api/staff/services/delivery', {
        headers: auth,
        data: { available: false, reason },
      })
    ).status(),
  ).toBe(403);
  expect((await request.post('/api/orders', { data: {} })).status()).toBe(400);
  const body = {
    idempotencyKey: randomUUID(),
    customer: 'Demo API Test',
    address: '12 Fictional Street',
    items: [{ productId: 'vase', quantity: 1 }],
  };
  const a = await request.post('/api/orders', { data: body }),
    data = await a.json();
  expect(a.ok()).toBeTruthy();
  const b = await request.post('/api/orders', { data: body });
  expect((await b.json()).id).toBe(data.id);
  expect(
    (
      await request.post('/api/orders', {
        data: { ...body, customer: 'Different Customer' },
      })
    ).status(),
  ).toBe(409);
  expect((await request.get(`/api/orders/${data.id}`)).status()).toBe(404);
  expect(
    (
      await request.get(`/api/orders/${data.id}`, {
        headers: { 'x-order-token': data.trackingToken },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await request.post(`/api/staff/jobs/${randomUUID()}/retry`, {
        headers: { Authorization: `Bearer ${oncall}` },
        data: { reason: 'short' },
      })
    ).status(),
  ).toBe(400);
});
test('mobile collection, category filter, search and cart controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Everyday essentials' })).toBeVisible();
  await page.screenshot({
    path: 'docs/screenshots/mobile.png',
    fullPage: true,
  });
  await test.info().attach('mobile screen', {
    path: 'docs/screenshots/mobile.png',
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: 'Lighting', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add Arc table lamp to cart' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Form ceramic vase to cart' })).toHaveCount(0);
  await page.getByLabel('Search products').fill('Halo');
  await expect(page.getByRole('button', { name: 'Add Halo pendant to cart' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Arc table lamp to cart' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add Halo pendant to cart' }).click();
  await page.getByRole('link', { name: /Shopping cart/ }).click();
  await page.getByRole('button', { name: 'Add one Halo pendant' }).click();
  await expect(page.getByText('$258.00', { exact: true })).toHaveCount(3);
  await page.getByRole('button', { name: 'Remove one Halo pendant' }).click();
  await page.getByRole('button', { name: 'Remove one Halo pendant' }).click();
  await expect(page.getByText('Your cart is empty')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('marketplace search, price sorting and department navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Arc table lamp to cart' }).waitFor();
  await page.getByLabel('Sort products').selectOption('high');
  const prices = (await page.locator('.market-product-price').allTextContents()).map((value) =>
    Number(value.replace(/[^0-9.]/g, '')),
  );
  expect(prices.length).toBeGreaterThan(0);
  expect(prices).toEqual([...prices].sort((a, b) => b - a));
  await page.getByLabel('Search products').fill('no-such-demo-product-xyz');
  await expect(page.getByRole('heading', { name: 'No matches this time' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByRole('button', { name: 'Catalog', exact: true }).click();
  await page.locator('.catalog-dropdown').getByRole('button', { name: 'Objects', exact: true }).click();
  await expect(page.locator('.catalog-dropdown')).toHaveCount(0);
  await expect(
    page.locator('.market-category-tiles').getByRole('button', { name: 'Objects', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Add Arc table lamp to cart' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add Form ceramic vase to cart' })).toBeVisible();
});

test('corrupted browser state recovers without breaking the cart or saved orders', async ({ page }) => {
  await page.goto('/');
  for (const cart of ['null', '[]', '{broken', '{"lamp":-1,"vase":"2"}']) {
    await page.evaluate((value) => {
      localStorage.setItem('orderflow.cart', value);
      localStorage.setItem('orderflow.orders', 'null');
    }, cart);
    await page.goto('/cart');
    await expect(page.getByText('Your cart is empty')).toBeVisible();
    await page.goto('/orders');
    await expect(page.getByRole('heading', { name: 'Your orders.' })).toBeVisible();
  }
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Arc table lamp to cart', exact: true }).click();
  await page.reload();
  await page.getByRole('link', { name: /Shopping cart, 1 items/ }).click();
  await expect(page.getByRole('heading', { name: 'Arc table lamp' })).toBeVisible();
});

test('checkout retry after a lost response reuses the original order', async ({ page, request }) => {
  await control(request, 'inventory', true);
  await control(request, 'delivery', true);
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Form ceramic vase to cart', exact: true }).click();
  await page.getByRole('link', { name: /Shopping cart/ }).click();
  await page.getByLabel('Full name').fill('Retry Demo');
  await page.getByLabel('Delivery address').fill('12 Fictional Retry Lane');
  await page.evaluate(() => sessionStorage.setItem('orderflow.checkout', '{broken'));
  let original: { id: string } | undefined;
  const keys: string[] = [];
  await page.route('**/api/orders', async (route) => {
    keys.push(route.request().postDataJSON().idempotencyKey);
    if (keys.length === 1) {
      const response = await route.fetch();
      expect(response.ok()).toBeTruthy();
      original = await response.json();
      await route.abort('failed');
    } else {
      await route.continue();
    }
  });
  await page.getByRole('button', { name: 'Place demo order' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Place demo order' }).click();
  await expect(page).toHaveURL(new RegExp(`/orders/${original!.id}$`));
  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
  await expect(page.getByText('Delivery arranged', { exact: true })).toBeVisible();
});
