const { test } = require('node:test');
const assert = require('node:assert');
const { requireRole } = require('../src/middleware/requireRole');
const { ApiError } = require('../src/utils/ApiError');

test('requireRole calls next when role matches', () => {
  const mw = requireRole('ADMIN');
  let nextCalled = false;
  const req = { user: { role: 'ADMIN' } };
  mw(req, {}, () => {
    nextCalled = true;
  });
  assert.strictEqual(nextCalled, true);
});

test('requireRole throws ApiError 403 when role does not match', () => {
  const mw = requireRole('ADMIN');
  const req = { user: { role: 'VIEWER' } };
  assert.throws(
    () => mw(req, {}, () => {}),
    (err) =>
      err instanceof ApiError && err.statusCode === 403 && err.code === 'FORBIDDEN',
  );
});

test('requireRole accepts any of several roles', () => {
  const mw = requireRole('ANALYST', 'ADMIN');
  let nextCalled = false;
  mw({ user: { role: 'ANALYST' } }, {}, () => {
    nextCalled = true;
  });
  assert.strictEqual(nextCalled, true);
});
