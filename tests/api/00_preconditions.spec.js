/**
 * Precondition tests — chạy đầu tiên (prefix 00_).
 * Xác nhận global-setup đã lấy token thành công trước khi các test khác chạy.
 */
const { test, expect } = require('../fixtures/authFixture');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.resolve(__dirname, '../../.auth/token.json');

test.describe('Preconditions', () => {
  test('Auth - token file exists and is not expired', () => {
    expect(fs.existsSync(AUTH_FILE), '.auth/token.json phải tồn tại (do global-setup tạo)').toBe(true);

    const { accessToken, expiresAt } = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    expect(accessToken, 'accessToken không được rỗng').toBeTruthy();
    expect(expiresAt, 'Token phải còn hạn').toBeGreaterThan(Date.now());
  });
});
