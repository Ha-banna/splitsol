/**
 * Smoke-test a deployed SplitSOL API (production or staging).
 *
 * Usage:
 *   PROD_API_URL=https://api.splitsol.app node scripts/prod-smoke.mjs
 *
 * Exits 0 when all checks pass; non-zero on failure.
 */

const baseUrl = (process.env.PROD_API_URL ?? 'https://api.splitsol.app').replace(/\/$/, '');

const checks = [];

function pass(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function fetchJson(path, init) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { url, status: res.status, body };
}

async function main() {
  console.log(`SplitSOL production smoke test`);
  console.log(`Target: ${baseUrl}\n`);

  // 1. Health
  try {
    const health = await fetchJson('/health');
    if (health.status !== 200) {
      fail('GET /health', `status ${health.status}`);
    } else if (health.body?.status !== 'ok') {
      fail('GET /health', `unexpected body: ${JSON.stringify(health.body)}`);
    } else {
      const leaks = [];
      if (health.body?.supabase?.key_role != null) leaks.push('key_role');
      if (health.body?.admin != null) leaks.push('admin flag');
      if (leaks.length) {
        fail('GET /health (production hygiene)', `exposes ${leaks.join(', ')} — trim /health in prod`);
      } else {
        pass('GET /health', `supabase configured: ${health.body?.supabase?.configured ?? '?'}`);
      }
    }
  } catch (error) {
    fail('GET /health', error instanceof Error ? error.message : String(error));
  }

  // 2. API root
  try {
    const root = await fetchJson('/v1');
    if (root.status !== 200) {
      fail('GET /v1', `status ${root.status}`);
    } else if (root.body?.name !== 'SplitSOL API') {
      fail('GET /v1', `unexpected name: ${root.body?.name}`);
    } else {
      pass('GET /v1', `version ${root.body?.version ?? '?'}`);
    }
  } catch (error) {
    fail('GET /v1', error instanceof Error ? error.message : String(error));
  }

  // 3. Auth challenge (DB + Solana parse path)
  try {
    const challenge = await fetchJson('/v1/auth/wallet/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: '11111111111111111111111111111112',
      }),
    });
    if (challenge.status !== 200) {
      fail('POST /v1/auth/wallet/challenge', `status ${challenge.status}`);
    } else if (!challenge.body?.message || !challenge.body?.nonce) {
      fail('POST /v1/auth/wallet/challenge', 'missing message or nonce');
    } else {
      pass('POST /v1/auth/wallet/challenge', 'challenge issued');
    }
  } catch (error) {
    fail('POST /v1/auth/wallet/challenge', error instanceof Error ? error.message : String(error));
  }

  // 4. Protected route rejects unauthenticated requests
  try {
    const groups = await fetchJson('/v1/groups');
    if (groups.status === 401) {
      pass('GET /v1/groups (no auth)', 'returns 401 as expected');
    } else {
      fail('GET /v1/groups (no auth)', `expected 401, got ${groups.status}`);
    }
  } catch (error) {
    fail('GET /v1/groups (no auth)', error instanceof Error ? error.message : String(error));
  }

  // 5. Admin dashboard should not be public in production
  try {
    const admin = await fetchJson('/admin');
    if (admin.status === 404) {
      pass('GET /admin', 'disabled (404)');
    } else if (admin.status === 200) {
      fail('GET /admin', 'admin UI is publicly reachable — set ADMIN_ENABLED=false in production');
    } else {
      pass('GET /admin', `status ${admin.status}`);
    }
  } catch (error) {
    fail('GET /admin', error instanceof Error ? error.message : String(error));
  }

  const failed = checks.filter((c) => !c.ok);
  console.log('');
  if (failed.length) {
    console.error(`${failed.length} check(s) failed.`);
    process.exit(1);
  }
  console.log(`All ${checks.length} checks passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
