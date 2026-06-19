require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { request } = require('@playwright/test');
const fs   = require('fs');
const path = require('path');

const HEALTH_URL = 'https://sis-qc.sis.flexiapp.cloud';
const API_URL    = process.env.BASE_URL || 'https://sis-qc-host.sis.flexiapp.cloud';
const AUTH_FILE  = path.resolve(__dirname, '../.auth/token.json');

function today() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function isTokenValidToday() {
  if (!fs.existsSync(AUTH_FILE)) return false;
  try {
    const { accessToken, expiresAt, createdDate } = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    return accessToken && expiresAt > Date.now() && createdDate === today();
  } catch {
    return false;
  }
}

module.exports = async function globalSetup() {
  console.log('\n[Setup] ── Global Setup Start ──────────────────────────');

  // 1. Health check
  const healthCtx = await request.newContext({ baseURL: HEALTH_URL });
  const healthRes = await healthCtx.get('/');
  const status    = healthRes.status();
  await healthCtx.dispose();
  if (status >= 500) throw new Error(`[Setup] Server lỗi (${status})`);
  console.log(`[Setup] ✔ Server is up — ${status}`);

  // 2. Dùng lại token nếu còn hạn và tạo hôm nay
  if (isTokenValidToday()) {
    console.log(`[Setup] ✔ Token hôm nay (${today()}) vẫn còn hạn — bỏ qua bước lấy token`);
    console.log('[Setup] ── Global Setup Complete ───────────────────────\n');
    return;
  }

  // 3. Lấy token mới
  const ctx = await request.newContext({ baseURL: API_URL });
  console.log('[Setup] Requesting access token from POST /connect/token...');

  const res = await ctx.post('/connect/token', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    form: {
      grant_type: 'password',
      username:   process.env.API_USERNAME || '',
      password:   process.env.API_PASSWORD || '',
      client_id:  process.env.CLIENT_ID    || 'StudentInfoSystem_App',
      scope:      process.env.SCOPE        || 'offline_access StudentInfoSystem',
    },
  });

  if (!res.ok()) {
    const text = await res.text();
    throw new Error(`[Setup] Token request failed (${res.status()}): ${text}`);
  }

  const body = await res.json();
  if (!body.access_token) throw new Error('[Setup] access_token not found in response');

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify({
    accessToken: body.access_token,
    expiresAt:   Date.now() + (body.expires_in || 3600) * 1000,
    createdDate: today(),
  }));

  await ctx.dispose();
  console.log(`[Setup] ✔ Token mới đã lưu — hết hạn dùng sau ngày ${today()}`);
  console.log('[Setup] ── Global Setup Complete ───────────────────────\n');
};
