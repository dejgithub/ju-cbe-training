/* eslint-disable no-console */
// End-to-end smoke test: boots the Express app on an ephemeral port and
// verifies that every role can log in and load its pages without server errors.
require('dotenv').config();
const app = require('../src/app');

const server = app.listen(0);

function cookieJar() {
  const jar = new Map();
  return {
    header() {
      return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    },
    absorb(res) {
      const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      cookies.forEach((c) => {
        const [pair] = c.split(';');
        const idx = pair.indexOf('=');
        if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
      });
    },
  };
}

function extractCsrf(html) {
  const m = html.match(/name="_csrf" value="([^"]+)"/);
  return m ? m[1] : null;
}

async function login(base, username, password) {
  const jar = cookieJar();
  let res = await fetch(`${base}/login`, { redirect: 'manual' });
  jar.absorb(res);
  let html = await res.text();
  const csrf = extractCsrf(html);
  if (!csrf) throw new Error('No CSRF token on login page');

  const body = new URLSearchParams({ _csrf: csrf, username, password });
  res = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: jar.header() },
    body,
    redirect: 'manual',
  });
  jar.absorb(res);
  return { jar, status: res.status, location: res.headers.get('location') };
}

async function get(base, jar, path) {
  const res = await fetch(`${base}${path}`, { headers: { Cookie: jar.header() }, redirect: 'manual' });
  jar.absorb(res);
  let body = '';
  if (res.status < 400) body = await res.text();
  else await res.text();
  const isServerError = res.status >= 500;
  const hasErrorPage = body.includes('Something went wrong') || body.includes('Unhandled error');
  return { status: res.status, isServerError, hasErrorPage, length: body.length };
}

const pagesByRole = {
  Admin: [
    '/dashboard', '/students', '/students/new', '/students/1', '/students/1/edit', '/students/1/history',
    '/students/import', '/programs', '/programs/new', '/programs/1', '/programs/1/edit',
    '/sites', '/sites/new', '/sites/1/edit', '/sites/partners', '/sites/partners/1',
    '/placements', '/placements/new', '/placements/1/edit',
    '/attendance', '/attendance/stats',
    '/reports', '/reports/1',
    '/assessments', '/assessments/1/criteria', '/assessments/1/evaluate', '/assessments/1',
    '/analytics', '/analytics/students', '/analytics/attendance', '/analytics/placements',
    '/analytics/assessments', '/analytics/fieldwork', '/analytics/programs', '/analytics/departments',
    '/notifications', '/profile', '/profile/password',
    '/admin/users', '/admin/users/new', '/admin/users/2/edit', '/admin/departments',
    '/admin/years', '/admin/groups', '/admin/announcements', '/admin/settings', '/admin/audit',
  ],
  Coordinator: [
    '/dashboard', '/students', '/programs', '/programs/1', '/sites', '/placements', '/placements/new',
    '/attendance', '/attendance/stats', '/reports', '/reports/1', '/assessments', '/assessments/1/evaluate',
    '/analytics', '/analytics/students', '/notifications', '/profile',
  ],
  Instructor: [
    '/dashboard', '/students', '/placements', '/attendance', '/attendance/stats',
    '/reports', '/reports/1', '/assessments', '/assessments/1/evaluate', '/programs', '/programs/1', '/notifications', '/profile',
  ],
  Student: [
    '/dashboard', '/placements', '/programs', '/programs/1', '/attendance', '/reports', '/reports/1',
    '/assessments', '/notifications', '/profile', '/profile/password',
  ],
  Partner: ['/dashboard', '/partner', '/notifications', '/profile'],
};

async function run() {
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  console.log(`Smoke test against ${base}\n`);

  const accounts = {
    Admin: 'admin',
    Coordinator: 'coordinator',
    Instructor: 'instructor',
    Student: 'student',
    Partner: 'partner',
  };

  let failures = 0;
  let checks = 0;

  for (const [role, username] of Object.entries(accounts)) {
    const { jar, status, location } = await login(base, username, 'Password@123');
    const loginOk = (status === 302 || status === 200) && (!location || location.includes('/dashboard') || location.includes('/profile/password'));
    console.log(`\n=== ${role} (${username}) ===`);
    console.log(`  login: ${status} -> ${location || '(no redirect)'} ${loginOk ? 'OK' : 'FAIL'}`);
    if (!loginOk) failures += 1;

    for (const path of pagesByRole[role]) {
      checks += 1;
      try {
        const r = await get(base, jar, path);
        const ok = !r.isServerError && !r.hasErrorPage && r.status !== 403;
        if (!ok) failures += 1;
        console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${String(r.status).padEnd(4)} ${path}${ok ? '' : '  <-- ' + (r.status === 403 ? 'ACCESS DENIED' : 'SERVER ERROR')}`);
      } catch (err) {
        failures += 1;
        console.log(`  FAIL ---- ${path}  (${err.message})`);
      }
    }
  }

  console.log(`\nChecks: ${checks + 5}, Failures: ${failures}`);
  server.close();
  process.exit(failures > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Smoke test crashed:', err);
  server.close();
  process.exit(1);
});