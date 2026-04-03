const BASE = process.env.API_BASE || 'http://127.0.0.1:8000';

async function req(method, path, { token, body, query } = {}) {
  const url = new URL(path, BASE);
  if (query) {
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text };
  }
  return { status: res.status, json };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function login(email, password) {
  const { status, json } = await req('POST', '/api/auth/login', {
    body: { email, password },
  });
  assert(status === 200 && json?.success && json?.data?.token, `login ${email}: got ${status}`);
  return json.data.token;
}

const results = [];

async function run(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`OK   ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
    console.log(`FAIL ${name} — ${e.message}`);
  }
}

async function main() {
  const adminTok = await login('admin@test.com', 'Admin@123');
  const analystTok = await login('analyst@test.com', 'Analyst@123');
  const viewerTok = await login('viewer@test.com', 'Viewer@123');

  let viewerUserId;
  let createdRecordId;
  let existingRecordId;

  await run('GET /health', async () => {
    const { status, json } = await req('GET', '/health');
    assert(status === 200 && json?.success === true, `status ${status}`);
  });

  await run('POST /api/auth/login invalid credentials → 401', async () => {
    const { status } = await req('POST', '/api/auth/login', {
      body: { email: 'admin@test.com', password: 'wrong' },
    });
    assert(status === 401, `expected 401, got ${status}`);
  });

  await run('POST /api/auth/login validation → 400', async () => {
    const { status } = await req('POST', '/api/auth/login', {
      body: { email: 'not-an-email', password: 'x' },
    });
    assert(status === 400, `expected 400, got ${status}`);
  });

  await run('POST /api/auth/register (unique email)', async () => {
    const email = `smoke_${Date.now()}@test.com`;
    const { status, json } = await req('POST', '/api/auth/register', {
      body: { name: 'Smoke User', email, password: 'Smoke@123456' },
    });
    assert(status === 201 && json?.data?.token, `status ${status}`);
  });

  await run('GET /api/records without auth → 401', async () => {
    const { status } = await req('GET', '/api/records');
    assert(status === 401, `expected 401, got ${status}`);
  });

  await run('GET /api/users as VIEWER → 403', async () => {
    const { status } = await req('GET', '/api/users', { token: viewerTok });
    assert(status === 403, `expected 403, got ${status}`);
  });

  await run('GET /api/users as ADMIN', async () => {
    const { status, json } = await req('GET', '/api/users', { token: adminTok });
    assert(status === 200 && Array.isArray(json?.data) && json.data.length >= 3, `status ${status}`);
    const viewer = json.data.find((u) => u.email === 'viewer@test.com');
    assert(viewer, 'seed viewer missing');
    viewerUserId = viewer.id;
  });

  await run('GET /api/users/:id as ADMIN', async () => {
    const { status, json } = await req('GET', `/api/users/${viewerUserId}`, { token: adminTok });
    assert(status === 200 && json?.data?.email === 'viewer@test.com', `status ${status}`);
  });

  await run('PATCH /api/users/:id/role as ADMIN', async () => {
    const { status, json } = await req('PATCH', `/api/users/${viewerUserId}/role`, {
      token: adminTok,
      body: { role: 'VIEWER' },
    });
    assert(status === 200 && json?.success, `status ${status}`);
  });

  await run('PATCH /api/users/:id/status as ADMIN', async () => {
    const { status, json } = await req('PATCH', `/api/users/${viewerUserId}/status`, {
      token: adminTok,
      body: { isActive: true },
    });
    assert(status === 200 && json?.success, `status ${status}`);
  });

  await run('GET /api/records as ADMIN (paginated)', async () => {
    const { status, json } = await req('GET', '/api/records', {
      token: adminTok,
      query: { page: 1, limit: 5 },
    });
    assert(
      status === 200 && Array.isArray(json?.data) && json?.pagination?.total >= 0,
      `status ${status}`,
    );
    assert(json.data.length > 0, 'no records from seed');
    existingRecordId = json.data[0].id;
  });

  await run('GET /api/records with filters', async () => {
    const { status, json } = await req('GET', '/api/records', {
      token: adminTok,
      query: { page: 1, limit: 10, type: 'INCOME', category: 'Salary' },
    });
    assert(status === 200 && Array.isArray(json?.data), `status ${status}`);
  });

  await run('GET /api/records/:id as ADMIN', async () => {
    const { status, json } = await req('GET', `/api/records/${existingRecordId}`, {
      token: adminTok,
    });
    assert(status === 200 && json?.data?.id === existingRecordId, `status ${status}`);
  });

  await run('POST /api/records as ANALYST → 403', async () => {
    const { status } = await req('POST', '/api/records', {
      token: analystTok,
      body: {
        amount: 1,
        type: 'INCOME',
        category: 'Test',
        date: new Date().toISOString(),
      },
    });
    assert(status === 403, `expected 403, got ${status}`);
  });

  await run('POST /api/records as ADMIN → 201', async () => {
    const { status, json } = await req('POST', '/api/records', {
      token: adminTok,
      body: {
        amount: 99.5,
        type: 'EXPENSE',
        category: 'SmokeTest',
        date: new Date().toISOString(),
        notes: 'smoke create',
      },
    });
    assert(status === 201 && json?.data?.id, `status ${status}`);
    createdRecordId = json.data.id;
  });

  await run('PATCH /api/records/:id as ADMIN', async () => {
    const { status, json } = await req('PATCH', `/api/records/${createdRecordId}`, {
      token: adminTok,
      body: { notes: 'smoke updated' },
    });
    assert(status === 200 && json?.data?.notes === 'smoke updated', `status ${status}`);
  });

  await run('DELETE /api/records/:id as ADMIN (soft)', async () => {
    const { status, json } = await req('DELETE', `/api/records/${createdRecordId}`, {
      token: adminTok,
    });
    assert(status === 200 && json?.data?.id === createdRecordId, `status ${status}`);
  });

  await run('GET /api/dashboard/summary as ANALYST', async () => {
    const { status, json } = await req('GET', '/api/dashboard/summary', { token: analystTok });
    assert(
      status === 200 &&
        typeof json?.data?.totalIncome === 'number' &&
        typeof json?.data?.netBalance === 'number',
      `status ${status}`,
    );
  });

  await run('GET /api/dashboard/summary as VIEWER → 403', async () => {
    const { status } = await req('GET', '/api/dashboard/summary', { token: viewerTok });
    assert(status === 403, `expected 403, got ${status}`);
  });

  await run('GET /api/dashboard/by-category as ANALYST', async () => {
    const { status, json } = await req('GET', '/api/dashboard/by-category', { token: analystTok });
    assert(status === 200 && Array.isArray(json?.data), `status ${status}`);
  });

  await run('GET /api/dashboard/trends as ADMIN (monthly)', async () => {
    const { status, json } = await req('GET', '/api/dashboard/trends', {
      token: adminTok,
      query: { period: 'monthly' },
    });
    assert(status === 200 && Array.isArray(json?.data), `status ${status}`);
  });

  await run('GET /api/dashboard/trends as ADMIN (weekly)', async () => {
    const { status, json } = await req('GET', '/api/dashboard/trends', {
      token: adminTok,
      query: { period: 'weekly' },
    });
    assert(status === 200 && Array.isArray(json?.data), `status ${status}`);
  });

  await run('GET /api/dashboard/recent as VIEWER', async () => {
    const { status, json } = await req('GET', '/api/dashboard/recent', { token: viewerTok });
    assert(status === 200 && Array.isArray(json?.data), `status ${status}`);
  });

  await run('GET /api/records/:id soft-deleted → 404', async () => {
    const { status } = await req('GET', `/api/records/${createdRecordId}`, { token: adminTok });
    assert(status === 404, `expected 404, got ${status}`);
  });

  const failed = results.filter((r) => !r.ok);
  console.log('\n---');
  console.log(`Passed: ${results.length - failed.length} / ${results.length}`);
  if (failed.length) {
    console.log('Failed:', failed.map((f) => f.name).join(', '));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
