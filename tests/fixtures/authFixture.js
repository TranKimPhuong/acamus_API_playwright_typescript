const { test: base } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { resolveUrl } = require('../../utils/apiHelper');

const AUTH_FILE = path.resolve(__dirname, '../../.auth/token.json');

/**
 * Proxy bao ngoài APIRequestContext để tự động log full URL cho mọi request.
 */
function createLoggingProxy(ctx) {
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'fetch'];
  const proxy = {};

  methods.forEach((method) => {
    proxy[method] = async (endpoint, ...args) => {
      const response = await ctx[method](endpoint, ...args);
      const fullUrl = resolveUrl(endpoint);
      const status = response.status();
      const statusLabel = status >= 200 && status < 300
        ? `\x1b[32m${status}\x1b[0m`
        : `\x1b[31m${status}\x1b[0m`;
      console.log(`  \x1b[36m[${method.toUpperCase().padEnd(6)}]\x1b[0m ${fullUrl}  →  ${statusLabel}`);
      return response;
    };
  });

  // Giữ lại các method khác của context (dispose, storageState, ...)
  return new Proxy(ctx, {
    get(target, prop) {
      return prop in proxy ? proxy[prop] : target[prop].bind(target);
    },
  });
}

/**
 * Custom fixture:
 *   - `accessToken`   : Bearer token string
 *   - `authedRequest` : APIRequestContext có Authorization + tự log URL
 */
const test = base.extend({
  accessToken: async ({}, use) => {
    if (!fs.existsSync(AUTH_FILE)) {
      throw new Error('Auth file not found. Make sure globalSetup ran successfully.');
    }
    const { accessToken } = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    await use(accessToken);
  },

  authedRequest: async ({ playwright }, use) => {
    const { accessToken: token } = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL || 'https://sis-qc-host.sis.flexiapp.cloud',
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Accept':        'application/json',
        'Content-Type':  'application/json',
      },
    });
    await use(createLoggingProxy(ctx));
    await ctx.dispose();
  },

  // Override fixture `request` mặc định để log URL cho MỌI test dùng { request }
  request: async ({ playwright }, use) => {
    const authPath = AUTH_FILE;
    let authHeader = {};
    if (fs.existsSync(authPath)) {
      const { accessToken } = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
      if (accessToken) authHeader = { 'Authorization': `Bearer ${accessToken}` };
    }
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL || 'https://sis-qc-host.sis.flexiapp.cloud',
      extraHTTPHeaders: {
        'Accept':        'application/json',
        'Content-Type':  'application/json',
        ...authHeader,
      },
    });
    await use(createLoggingProxy(ctx));
    await ctx.dispose();
  },
});

const { expect } = base;
module.exports = { test, expect };
