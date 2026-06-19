const BASE_URL = process.env.BASE_URL || 'https://sis-qc-host.sis.flexiapp.cloud';

/**
 * Resolve full URL từ endpoint (relative hoặc absolute).
 * Dùng để log, không ảnh hưởng đến request thực tế.
 */
function resolveUrl(endpoint) {
  try {
    // Nếu đã là URL tuyệt đối thì giữ nguyên
    new URL(endpoint);
    return endpoint;
  } catch {
    return `${BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  }
}

/**
 * In log dạng: [METHOD] <full URL>  →  <status>
 */
function logRequest(method, endpoint, status) {
  const url = resolveUrl(endpoint);
  const statusLabel = status >= 200 && status < 300
    ? `\x1b[32m${status}\x1b[0m`   // xanh lá
    : `\x1b[31m${status}\x1b[0m`;  // đỏ
  console.log(`  \x1b[36m[${method}]\x1b[0m ${url}  →  ${statusLabel}`);
}

/**
 * Wrapper around Playwright's APIRequestContext with common helpers.
 */
class ApiHelper {
  constructor(request) {
    this.request = request;
  }

  async get(endpoint, options = {}) {
    const response = await this.request.get(endpoint, options);
    return this._parse(response);
  }

  async post(endpoint, body, options = {}) {
    const response = await this.request.post(endpoint, { data: body, ...options });
    return this._parse(response);
  }

  async put(endpoint, body, options = {}) {
    const response = await this.request.put(endpoint, { data: body, ...options });
    return this._parse(response);
  }

  async patch(endpoint, body, options = {}) {
    const response = await this.request.patch(endpoint, { data: body, ...options });
    return this._parse(response);
  }

  async delete(endpoint, options = {}) {
    const response = await this.request.delete(endpoint, options);
    return this._parse(response);
  }

  async _parse(response) {
    let body;
    const contentType = response.headers()['content-type'] || '';
    try {
      body = contentType.includes('application/json') ? await response.json() : await response.text();
    } catch {
      body = null;
    }
    return { status: response.status(), headers: response.headers(), body };
  }
}

module.exports = { ApiHelper, resolveUrl, logRequest };
