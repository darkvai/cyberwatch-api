process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-jwt-secret';
process.env.ORIGIN = process.env.ORIGIN || 'http://localhost:3000';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../../app');
const Analyst = require('../../src/models/analyst');
const ApiKey = require('../../src/models/ApiKey');
const Asset = require('../../src/models/asset');
const Incident = require('../../src/models/incident');
const LogEvent = require('../../src/models/logEvent');

const BASE = '/v1/cyberwatch';
const os = require('os');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { serverSelectionTimeoutMS: 5000 , runtimeAdapters: { os }});
    await Incident.syncIndexes();
    await ApiKey.syncIndexes();
}, 60_000);

afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
});

describe('CyberWatch API — End-to-End (Supertest)', () => {
    let l3Agent;
    let l1Agent;
    let apiKey;
    let createdIncidentId;

    beforeAll(() => {
        l3Agent = request.agent(app);
        l1Agent = request.agent(app);
    });

    // ── 1. Authentication & RBAC ──────────────────────────────────────────
    describe('Authentication & RBAC', () => {
        test('POST /register provisions L3 and L1 analysts', async () => {
            const resL3 = await request(app)
                .post(`${BASE}/register`)
                .send({
                    name: 'Lead Analyst',
                    username: 'e2e_l3',
                    password: 'Password123!',
                    role: 'L3'
                });
            expect(resL3.status).toBe(201);
            expect(resL3.body.analyst.username).toBe('e2e_l3');

            const resL1 = await request(app)
                .post(`${BASE}/register`)
                .send({
                    name: 'Tier 1 Analyst',
                    username: 'e2e_l1',
                    password: 'Password123!',
                    role: 'L1'
                });
            expect(resL1.status).toBe(201);
            expect(resL1.body.analyst.username).toBe('e2e_l1');
        });

        test('POST /register rejects duplicate username with 409', async () => {
            const res = await request(app)
                .post(`${BASE}/register`)
                .send({
                    name: 'Duplicate',
                    username: 'e2e_l3',
                    password: 'Password123!',
                    role: 'L1'
                });
            expect(res.status).toBe(409);
        });

        test('POST /login sets HTTP-only jwt cookie for L3 and L1 agents', async () => {
            const loginL3 = await l3Agent
                .post(`${BASE}/login`)
                .send({ username: 'e2e_l3', password: 'Password123!' });
            expect(loginL3.status).toBe(200);
            expect(loginL3.headers['set-cookie']).toBeDefined();

            const loginL1 = await l1Agent
                .post(`${BASE}/login`)
                .send({ username: 'e2e_l1', password: 'Password123!' });
            expect(loginL1.status).toBe(200);
            expect(loginL1.headers['set-cookie']).toBeDefined();
        });

        test('GET /me returns authenticated user and rejects unauthenticated requests', async () => {
            const unauth = await request(app).get(`${BASE}/me`);
            expect(unauth.status).toBe(401);

            const auth = await l3Agent.get(`${BASE}/me`);
            expect(auth.status).toBe(200);
            expect(auth.body.logged_in).toBe(true);
            expect(auth.body.user.role).toBe('L3');
        });

        test('POST /admin/api-keys enforces L3 RBAC and issues key to L3', async () => {
            const forbidden = await l1Agent
                .post(`${BASE}/admin/api-keys`)
                .send({ consumer_name: 'Unauthorized Consumer' });
            expect(forbidden.status).toBe(403);

            const created = await l3Agent
                .post(`${BASE}/admin/api-keys`)
                .send({ consumer_name: 'E2E Winlogbeat' });
            expect(created.status).toBe(201);
            expect(created.body.key).toMatch(/^cw_live_/);
            apiKey = created.body.key;
        });

        test('GET /admin/api-keys lists key metadata without exposing hashes', async () => {
            const res = await l3Agent.get(`${BASE}/admin/api-keys`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
            expect(res.body[0].consumer_name).toBe('E2E Winlogbeat');
            expect(res.body[0].key_hash).toBeUndefined();
        });
    });

    // ── 2. Log Ingestion, Asset Discovery & Correlation ───────────────────
    describe('Log Ingestion -> Asset Discovery -> Correlation Engine', () => {
        test('POST /logs rejects missing API key (401) and malformed payloads (400)', async () => {
            const noKey = await request(app)
                .post(`${BASE}/logs`)
                .send({ hostname: 'PC-1' });
            expect(noKey.status).toBe(401);

            const badPayload = await request(app)
                .post(`${BASE}/logs`)
                .set('Authorization', `Bearer ${apiKey}`)
                .send({ invalid: 'data' });
            expect(badPayload.status).toBe(400);
        });

        test('POST /logs with Winlogbeat 4688 (-enc) ingests log, registers asset, and triggers T1059.001 incident', async () => {
            const res = await request(app)
                .post(`${BASE}/logs`)
                .set('Authorization', `Bearer ${apiKey}`)
                .send({
                    host: { hostname: 'E2E-HR-PC', ip: ['10.10.1.25'] },
                    event: { code: '4688', severity: 'high' },
                    process: { command_line: 'powershell.exe -enc SQBFAFgA' },
                    message: 'Suspicious PowerShell execution'
                });

            expect(res.status).toBe(201);
            expect(res.body.logId).toBeDefined();

            // Verify Asset Discovery
            const assetsRes = await l1Agent.get(`${BASE}/assets`);
            expect(assetsRes.status).toBe(200);
            expect(assetsRes.body.some((a) => a.hostname === 'e2e-hr-pc')).toBe(true);

            // Verify Log Storage
            const logsRes = await l1Agent.get(`${BASE}/logs`);
            expect(logsRes.status).toBe(200);
            expect(logsRes.body.some((l) => l.event_type === 'Process_Creation')).toBe(true);

            // Verify Incident Created by Correlation Engine
            const incRes = await l1Agent.get(`${BASE}/incidents`);
            expect(incRes.status).toBe(200);
            const psIncident = incRes.body.find((i) => i.rule_id === 'RULE_T1059_001_POWERSHELL');
            expect(psIncident).toBeDefined();
            expect(psIncident.status).toBe('Open');
            expect(psIncident.due_at).toBeDefined();
            createdIncidentId = psIncident._id;
        });

        test('POST /logs with 5x Winlogbeat 4625 triggers T1110 Brute Force incident', async () => {
            for (let i = 0; i < 5; i++) {
                const res = await request(app)
                    .post(`${BASE}/logs`)
                    .set('Authorization', `Bearer ${apiKey}`)
                    .send({
                        host: { hostname: 'E2E-DC-01', ip: ['10.10.0.5'] },
                        event: { code: '4625', severity: 'high' },
                        message: `Failed logon attempt #${i + 1}`
                    });
                expect(res.status).toBe(201);
            }

            const incRes = await l3Agent.get(`${BASE}/incidents`);
            expect(incRes.status).toBe(200);
            const bfIncident = incRes.body.find((i) => i.rule_id === 'RULE_T1110_BRUTE_FORCE');
            expect(bfIncident).toBeDefined();
            expect(bfIncident.related_logs).toHaveLength(5);
        });

        test('POST /logs accepts CEF firewall deny logs', async () => {
            const res = await request(app)
                .post(`${BASE}/logs`)
                .set('Authorization', `Bearer ${apiKey}`)
                .send({
                    raw: 'CEF:0|Fortinet|FortiGate|7.0|Deny|Port scan|7|src=10.10.9.9 shost=E2E-FW-01'
                });
            expect(res.status).toBe(201);

            const logsRes = await l1Agent.get(`${BASE}/logs`);
            expect(logsRes.body.some((l) => l.event_type === 'Firewall_Deny')).toBe(true);
        });
    });

    // ── 3. Incident Lifecycle & RBAC ──────────────────────────────────────
    describe('Incident Lifecycle & RBAC', () => {
        test('PATCH /incidents/:id rejects L1 (403) and allows L3 status transitions', async () => {
            const forbidden = await l1Agent
                .patch(`${BASE}/incidents/${createdIncidentId}`)
                .send({ status: 'In Progress' });
            expect(forbidden.status).toBe(403);

            const inProgress = await l3Agent
                .patch(`${BASE}/incidents/${createdIncidentId}`)
                .send({ status: 'In Progress' });
            expect(inProgress.status).toBe(200);
            expect(inProgress.body.status).toBe('In Progress');

            const resolved = await l3Agent
                .patch(`${BASE}/incidents/${createdIncidentId}`)
                .send({ status: 'Resolved' });
            expect(resolved.status).toBe(200);
            expect(resolved.body.status).toBe('Resolved');
        });

        test('DELETE /incidents/:id rejects L1 (403) and allows L3', async () => {
            const forbidden = await l1Agent
                .delete(`${BASE}/incidents/${createdIncidentId}`);
            expect(forbidden.status).toBe(403);

            const deleted = await l3Agent
                .delete(`${BASE}/incidents/${createdIncidentId}`);
            expect(deleted.status).toBe(200);
            expect(deleted.body.deletedId).toBe(createdIncidentId);
        });
    });

    // ── 4. Logout ─────────────────────────────────────────────────────────
    describe('Session Logout', () => {
        test('GET /logout clears jwt cookie and redirects', async () => {
            const res = await l1Agent.get(`${BASE}/logout`);
            expect(res.status).toBe(302);
            expect(res.headers['set-cookie'][0]).toMatch(/jwt=;/);
        });
    });
});
