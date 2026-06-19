const { expect } = require('@playwright/test');

/**
 * Validate that an object has all required keys with expected types.
 * @param {object} obj - The object to validate.
 * @param {Record<string, string>} schema - Map of key -> expected typeof value.
 */
function validateSchema(obj, schema) {
  for (const [key, type] of Object.entries(schema)) {
    expect(obj, `Response should contain key "${key}"`).toHaveProperty(key);
    expect(typeof obj[key], `"${key}" should be of type "${type}"`).toBe(type);
  }
}

module.exports = { validateSchema };
