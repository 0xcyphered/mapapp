require('../setup');
const request = require('supertest');
const { createApp } = require('../../src/app');

describe('GET /health', () => {
  const app = createApp();

  it('returns 200 and mongo ok when connected', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('baryar-api');
    expect(res.body.checks.mongo).toBe('ok');
  });

  it('returns 404 JSON for unknown /api routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'not_found' });
  });
});
