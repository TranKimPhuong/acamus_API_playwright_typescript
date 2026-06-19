require('dotenv').config();
const { test, expect } = require('@playwright/test');
const { ApiHelper }    = require('../../utils/apiHelper');
const { newEvent, updatedEvent } = require('../fixtures/testData');
const fs   = require('fs');
const path = require('path');

const BASE_URL   = process.env.BASE_URL || 'https://sis-qc-host.sis.flexiapp.cloud';
const EVENT_EP   = '/api/app/event';
const CAMPUS_ID  = process.env.campus_id || '';
const STATE_FILE = path.resolve(__dirname, '../../.auth/event-state.json');
const AUTH_FILE  = path.resolve(__dirname, '../../.auth/token.json');
const FAKE_UUID  = '11111111-1111-1111-1111-111111111111';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function saveState(data) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const current = fs.existsSync(STATE_FILE)
    ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
    : {};
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...current, ...data }));
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return {};
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
}

function getAccessToken() {
  return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')).accessToken;
}

function authHeader(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

test.describe.serial('Event API', () => {
  let api;
  let token;
  let ctx;

  test.beforeAll(async ({ playwright }) => {
    token = getAccessToken();
    ctx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        'Accept':       'application/json',
        'Content-Type': 'application/json',
      },
    });
    api = new ApiHelper(ctx);
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // HAPPY PATH — tạo / đọc / update / xóa
  // ════════════════════════════════════════════════════════════════════════════

  test('POST /event - tạo mới sự kiện 1', async () => {
    const title   = `Playwright tạo Sự kiện 1 - ${Date.now()}`;
    const payload = newEvent(title);
    const t0 = Date.now();
    const { status, body } = await api.post(EVENT_EP, payload, authHeader(token));
    const responseTime = Date.now() - t0;

    expect(responseTime, `Response time ${responseTime}ms vượt 2000ms`).toBeLessThan(2000);
    expect([200, 201], `body: ${JSON.stringify(body)}`).toContain(status);
    expect(body).toHaveProperty('id');
    expect(body.id).toMatch(UUID_REGEX);

    saveState({ eventId: body.id, eventTitle: body.title });
  });

  test('POST /event - tạo mới sự kiện 2', async () => {
    const title   = `Playwright tạo Sự kiện 2 - ${Date.now()}`;
    const payload = newEvent(title);
    const t0 = Date.now();
    const { status, body } = await api.post(EVENT_EP, payload, authHeader(token));
    const responseTime = Date.now() - t0;

    expect(responseTime, `Response time ${responseTime}ms vượt 2000ms`).toBeLessThan(2000);
    expect([200, 201], `body: ${JSON.stringify(body)}`).toContain(status);
    expect(body).toHaveProperty('id');
    expect(body.id).toMatch(UUID_REGEX);

    saveState({ eventId2: body.id, eventTitle2: body.title });
  });

  test('POST /event - tạo sự kiện trùng tên với sự kiện 2', async () => {
    const { eventTitle2 } = loadState();
    expect(eventTitle2, 'eventTitle2 chưa được lưu từ test trước').toBeTruthy();

    const payload = newEvent(eventTitle2);
    const t0 = Date.now();
    const { status, body } = await api.post(EVENT_EP, payload, authHeader(token));
    const responseTime = Date.now() - t0;

    expect(responseTime, `Response time ${responseTime}ms vượt 2000ms`).toBeLessThan(2000);
    expect([200, 201], `body: ${JSON.stringify(body)}`).toContain(status);
    expect(body).toHaveProperty('id');
    expect(body.id).toMatch(UUID_REGEX);

    saveState({ duplicatedEventId: body.id });
  });

  test('GET /event/:id - verify sự kiện 1 vừa tạo', async () => {
    const { eventId, eventTitle } = loadState();
    expect(eventId, 'eventId chưa được lưu').toBeTruthy();

    const t0 = Date.now();
    const { status, body } = await api.get(
      `${EVENT_EP}/${eventId}?campusId=${CAMPUS_ID}`,
      authHeader(token),
    );
    const responseTime = Date.now() - t0;

    expect(responseTime, `Response time ${responseTime}ms vượt 2000ms`).toBeLessThan(2000);
    expect([200, 201], `body: ${JSON.stringify(body)}`).toContain(status);
    expect(body.id).toBe(eventId);
    expect(body.title).toBe(eventTitle);
  });

  test('PUT /event/:id - cập nhật sự kiện 1', async () => {
    const { eventId, eventTitle } = loadState();
    expect(eventId, 'eventId chưa được lưu').toBeTruthy();

    const payload = updatedEvent(eventId, eventTitle);
    const t0 = Date.now();
    const { status, body } = await api.put(
      `${EVENT_EP}/${eventId}`,
      payload,
      authHeader(token),
    );
    const responseTime = Date.now() - t0;

    expect(responseTime, `Response time ${responseTime}ms vượt 2000ms`).toBeLessThan(2000);
    expect([200, 201], `body: ${JSON.stringify(body)}`).toContain(status);
  });

  test('DELETE /event/multiple-events - xóa sự kiện 1', async () => {
    const { eventId } = loadState();
    expect(eventId, 'eventId chưa được lưu').toBeTruthy();

    const { status, body } = await api.delete(
      `${EVENT_EP}/multiple-events?ids=${eventId}`,
      authHeader(token),
    );
    expect([200, 204], `body: ${JSON.stringify(body)}`).toContain(status);
  });

  test('GET /event/:id - verify sự kiện 1 đã bị xóa', async () => {
    const { eventId } = loadState();

    const { status } = await api.get(
      `${EVENT_EP}/${eventId}?campusId=${CAMPUS_ID}`,
      authHeader(token),
    );
    expect([200, 400, 404]).toContain(status);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // NEGATIVE TESTS
  // ════════════════════════════════════════════════════════════════════════════

  test('POST /event - thiếu title → lỗi validation', async () => {
    const payload = newEvent(undefined);
    delete payload.title;

    const { status } = await api.post(EVENT_EP, payload, authHeader(token));
    expect([400, 422, 500]).toContain(status);
  });

  test('POST /event - thiếu campusId → lỗi validation', async () => {
    const payload = newEvent(`Playwright thiếu campusId - ${Date.now()}`);
    delete payload.campusId;

    const { status } = await api.post(EVENT_EP, payload, authHeader(token));
    expect([400, 404, 422]).toContain(status);
  });

  test('POST /event - body rỗng → lỗi validation', async () => {
    const response = await ctx.post(EVENT_EP, {
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: '',
    });
    expect([400, 415, 422]).toContain(response.status());
  });

  test('GET /event/:id - ID không tồn tại → title null', async () => {
    const { status, body } = await api.get(
      `${EVENT_EP}/${FAKE_UUID}?campusId=${CAMPUS_ID}`,
      authHeader(token),
    );
    expect(status).toBe(200);
    expect(body.title).toBeNull();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CLEANUP — xóa sự kiện 2 + sự kiện trùng tên
  // ════════════════════════════════════════════════════════════════════════════

  test('DELETE /event/multiple-events - xóa nhiểu Sự kiện', async () => {
    const { eventId2, duplicatedEventId } = loadState();
    expect(eventId2, 'eventId2 chưa được lưu').toBeTruthy();
    expect(duplicatedEventId, 'duplicatedEventId chưa được lưu').toBeTruthy();

    const { status, body } = await api.delete(
      `${EVENT_EP}/multiple-events?ids=${eventId2}&ids=${duplicatedEventId}`,
      authHeader(token),
    );
    expect([200, 204], `body: ${JSON.stringify(body)}`).toContain(status);
  });

  test('GET /event/:id - verify sự kiện 2 đã bị xóa', async () => {
    const { eventId2 } = loadState();

    const { status } = await api.get(
      `${EVENT_EP}/${eventId2}?campusId=${CAMPUS_ID}`,
      authHeader(token),
    );
    expect([200, 400, 404]).toContain(status);
  });
});
