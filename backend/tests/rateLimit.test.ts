import request from 'supertest';
import rateLimit from 'express-rate-limit';
import { describe, expect, it } from 'vitest';
import express from 'express';
import { authLimiter, groupCreateLimiter, settlementLimiter } from '../src/middleware/rateLimit';
import { requireAuth } from '../src/middleware/auth';
import { signToken } from '../src/lib/jwt';
import { mockUser } from './helpers/fixtures';

function buildTestApp(limiter: ReturnType<typeof rateLimit>) {
  const app = express();
  app.use(express.json());
  app.use(requireAuth);
  app.post('/limited', limiter, (_req, res) => res.json({ ok: true }));
  return app;
}

describe('Rate limiting middleware', () => {
  const token = signToken({ sub: mockUser.id, wallet: mockUser.wallet_address });

  it('authLimiter returns 429 after max requests', async () => {
    const app = express();
    app.use(express.json());
    app.post('/auth', authLimiter, (_req, res) => res.json({ ok: true }));

    const limit = 50;
    for (let i = 0; i < limit; i++) {
      const res = await request(app).post('/auth').send({});
      expect(res.status).toBe(200);
    }
    const blocked = await request(app).post('/auth').send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('RATE_LIMITED');
    expect(blocked.headers['ratelimit-limit']).toBeDefined();
  });

  it('groupCreateLimiter keys by authenticated user', async () => {
    const app = buildTestApp(groupCreateLimiter);
    const limit = 100;

    for (let i = 0; i < limit; i++) {
      const res = await request(app)
        .post('/limited')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(200);
    }
    const blocked = await request(app)
      .post('/limited')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(blocked.status).toBe(429);
  });

  it('settlementLimiter keys by wallet from JWT', async () => {
    const app = buildTestApp(settlementLimiter);
    const limit = 100;

    for (let i = 0; i < limit; i++) {
      const res = await request(app)
        .post('/limited')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(200);
    }
    const blocked = await request(app)
      .post('/limited')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(blocked.status).toBe(429);
  });
});
