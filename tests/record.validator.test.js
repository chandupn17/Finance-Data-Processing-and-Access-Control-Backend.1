const { test } = require('node:test');
const assert = require('node:assert');
const {
  createRecordSchema,
  listRecordsQuerySchema,
} = require('../src/validators/record.validator');

test('createRecordSchema accepts a valid payload', () => {
  const r = createRecordSchema.safeParse({
    amount: 10.5,
    type: 'INCOME',
    category: 'Salary',
    date: '2024-01-15',
  });
  assert.strictEqual(r.success, true);
});

test('createRecordSchema rejects non-positive amount', () => {
  const r = createRecordSchema.safeParse({
    amount: 0,
    type: 'INCOME',
    category: 'X',
    date: '2024-01-15',
  });
  assert.strictEqual(r.success, false);
});

test('listRecordsQuerySchema applies defaults for page and limit', () => {
  const r = listRecordsQuerySchema.safeParse({});
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.data.page, 1);
  assert.strictEqual(r.data.limit, 20);
});
