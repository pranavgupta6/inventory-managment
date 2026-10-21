import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Integration tests for the Express application
// ---------------------------------------------------------------------------
// We test the app in isolation without real Lark credentials.

// We must set env vars before importing the app (env.ts reads process.env at load)
process.env['NODE_ENV'] = 'test';
process.env['LARK_PROVIDER'] = 'lark';
process.env['LARK_APP_ID'] = '';
process.env['LARK_APP_SECRET'] = '';
process.env['LARK_BITABLE_APP_TOKEN'] = '';

import { createApp } from '../../app.js';

const app = createApp();

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(typeof res.body.data.timestamp).toBe('string');
  });
});

describe('GET /api/integration-status', () => {
  it('returns 200 with not_configured level when credentials are absent', async () => {
    const res = await request(app).get('/api/integration-status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.level).toBe('not_configured');
    expect(res.body.data.provider).toBe('lark');
  });
});

describe('GET /api/config-info', () => {
  it('returns safe config info without secrets', async () => {
    const res = await request(app).get('/api/config-info');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.appIdConfigured).toBe(false);
    expect(res.body.data.environment).toBe('test');
    // Should NOT include actual app ID or secret
    expect(JSON.stringify(res.body)).not.toContain('app_secret');
  });
});

describe('GET /api/nonexistent', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent-route-xyz');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
