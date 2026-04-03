const { test } = require('node:test');
const assert = require('node:assert');
const { ApiError } = require('../src/utils/ApiError');

test('ApiError carries statusCode, message, and code', () => {
  const e = new ApiError(404, 'Resource missing', 'NOT_FOUND');
  assert.strictEqual(e.statusCode, 404);
  assert.strictEqual(e.message, 'Resource missing');
  assert.strictEqual(e.code, 'NOT_FOUND');
  assert.strictEqual(e.isOperational, true);
});

test('ApiError defaults code to ERROR', () => {
  const e = new ApiError(500, 'Boom');
  assert.strictEqual(e.code, 'ERROR');
});
