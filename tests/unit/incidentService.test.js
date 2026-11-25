const mongoose = require('mongoose');
const os = require('os');
const { MongoMemoryServer } = require('mongodb-memory-server');
const incidentService = require('../../src/services/incidentService');
const Incident = require('../../src/models/incident');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(),{runtimeAdapters: { os }});
    await Incident.syncIndexes(); // Ensures the partial unique index is active
}, 60_000);

afterEach(async () => {
    await Incident.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Incident Service Business Logic', () => {
    // ── Deduplication ───────────────────────────────────────────────────
    test('deduplicates concurrent alerts into 1 incident with incremented alert_count', async () => {
        const assetId = new mongoose.Types.ObjectId();
        const rule = {
            id: 'RULE_T1110_BRUTE_FORCE',
            mitre: 'T1110',
            name: 'Brute Force',
            matchEvent: 'Auth_Failure',
            threshold: 5,
            windowMs: 120000,
            severity: 'High',
            assignedTier: 'L1',
            tags: ['T1110']
        };
        const savedLog = { _id: new mongoose.Types.ObjectId(), hostname: 'FINANCE-01' };

        await incidentService.createOrDedupeSystemIncident({ rule, savedLog, assetId, logIds: [savedLog._id] });
        await incidentService.createOrDedupeSystemIncident({ rule, savedLog, assetId, logIds: [savedLog._id] });

        const all = await Incident.find({ asset_id: assetId });
        expect(all).toHaveLength(1);
        expect(all[0].alert_count).toBe(2);
        expect(all[0].tags).toContain('T1110');
    });

    // ── Optimistic Locking ──────────────────────────────────────────────
    test('rejects stale updates with 409 Conflict (Optimistic Locking)', async () => {
        const ticket = await Incident.create({
            title: 'Test Ticket',
            description: 'Testing optimistic locking',
            severity: 'High',
            status: 'Open',
            asset_id: new mongoose.Types.ObjectId()
        });

        // Analyst A updates using __v = 0 -> succeeds (__v becomes 1)
        const updated = await incidentService.updateIncidentStatus(ticket._id, 'In Progress', 0);
        expect(updated.__v).toBe(1);

        // Analyst B tries to update using stale __v = 0 -> throws 409
        await expect(
            incidentService.updateIncidentStatus(ticket._id, 'Escalated', 0)
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    // ── Status FSM ──────────────────────────────────────────────────────
    test('allows valid transitions: Open → In Progress → Escalated → Resolved', async () => {
        const ticket = await Incident.create({
            title: 'FSM Test',
            description: 'Valid transitions',
            severity: 'Medium',
            status: 'Open',
            asset_id: new mongoose.Types.ObjectId()
        });

        const t1 = await incidentService.updateIncidentStatus(ticket._id, 'In Progress');
        expect(t1.status).toBe('In Progress');

        const t2 = await incidentService.updateIncidentStatus(t1._id, 'Escalated');
        expect(t2.status).toBe('Escalated');

        const t3 = await incidentService.updateIncidentStatus(t2._id, 'Resolved');
        expect(t3.status).toBe('Resolved');
    });

    test('rejects invalid transition: Resolved → Open', async () => {
        const ticket = await Incident.create({
            title: 'FSM Block',
            description: 'Invalid transition test',
            severity: 'Low',
            status: 'Resolved',
            asset_id: new mongoose.Types.ObjectId()
        });

        await expect(
            incidentService.updateIncidentStatus(ticket._id, 'Open')
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    // ── SLA Calculation ─────────────────────────────────────────────────
    test('Critical ticket gets a shorter sla_deadline than a Low ticket', async () => {
        const criticalTicket = await Incident.create({
            title: 'SLA Critical',
            description: 'Should have 1h SLA',
            severity: 'Critical',
            status: 'Open',
            asset_id: new mongoose.Types.ObjectId()
        });

        const lowTicket = await Incident.create({
            title: 'SLA Low',
            description: 'Should have 48h SLA',
            severity: 'Low',
            status: 'Open',
            asset_id: new mongoose.Types.ObjectId()
        });

        expect(criticalTicket.due_at).toBeDefined();
        expect(lowTicket.due_at).toBeDefined();

        // Critical = +1h, Low = +48h → critical deadline is strictly earlier
        expect(criticalTicket.due_at.getTime()).toBeLessThan(lowTicket.due_at.getTime());

        // Verify approximate SLA windows (tolerance: ±10 seconds)
        const criticalDelta = criticalTicket.due_at - criticalTicket.createdAt;
        const lowDelta = lowTicket.due_at - lowTicket.createdAt;

        expect(criticalDelta).toBeCloseTo(1 * 60 * 60 * 1000, -4);   // ~1 hour
        expect(lowDelta).toBeCloseTo(48 * 60 * 60 * 1000, -4);        // ~48 hours
    });

    // ── Partial Index Reset ─────────────────────────────────────────────
    test('creates a new ticket after the existing one is Resolved', async () => {
        const assetId = new mongoose.Types.ObjectId();
        const rule = {
            id: 'RULE_T1110_BRUTE_FORCE',
            mitre: 'T1110',
            name: 'Brute Force',
            matchEvent: 'Auth_Failure',
            threshold: 5,
            windowMs: 120000,
            severity: 'High',
            assignedTier: 'L1',
            tags: ['T1110']
        };
        const savedLog = { _id: new mongoose.Types.ObjectId(), hostname: 'HR-PC' };

        // 1. Create the first incident
        await incidentService.createOrDedupeSystemIncident({ rule, savedLog, assetId, logIds: [savedLog._id] });

        // 2. Resolve it so it falls out of the partial unique index
        const first = await Incident.findOne({ asset_id: assetId, rule_id: rule.id });
        first.status = 'Resolved';
        await first.save();

        // 3. A new alert should create a *second* ticket, not update the resolved one
        await incidentService.createOrDedupeSystemIncident({ rule, savedLog, assetId, logIds: [savedLog._id] });

        const all = await Incident.find({ asset_id: assetId, rule_id: rule.id });
        expect(all).toHaveLength(2);
        expect(all.filter(i => i.status === 'Resolved')).toHaveLength(1);
        expect(all.filter(i => i.status === 'Open')).toHaveLength(1);
    });
});
