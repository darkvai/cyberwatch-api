const correlationEngine = require('../../src/services/correlationEngine');
const incidentService = require('../../src/services/incidentService');

jest.mock('../../src/services/incidentService');

describe('Correlation Engine Sliding Window', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('triggers T1110 on 5th Auth_Failure within 2 minutes', async () => {
        const assetId = 'asset-1';
        const log = { _id: 'log-1', hostname: 'PC-1', event_type: 'Auth_Failure' };

        for (let i = 0; i < 4; i++) {
            await correlationEngine.evaluate(log, assetId);
        }
        expect(incidentService.createOrDedupeSystemIncident).not.toHaveBeenCalled();

        await correlationEngine.evaluate(log, assetId);
        expect(incidentService.createOrDedupeSystemIncident).toHaveBeenCalledTimes(1);
    });

    test('does NOT trigger T1110 if events expire outside the 2-minute window', async () => {
        const assetId = 'asset-2';
        const log = { _id: 'log-2', hostname: 'PC-2', event_type: 'Auth_Failure' };

        for (let i = 0; i < 4; i++) {
            await correlationEngine.evaluate(log, assetId);
        }

        // Fast-forward 3 minutes so the first 4 events drop out of the window
        jest.advanceTimersByTime(3 * 60 * 1000);

        await correlationEngine.evaluate(log, assetId);
        expect(incidentService.createOrDedupeSystemIncident).not.toHaveBeenCalled();
    });

    test('triggers T1490 immediately on shadow copy deletion', async () => {
        const log = {
            _id: 'log-3',
            hostname: 'SRV-01',
            event_type: 'Process_Creation',
            command_line: 'vssadmin delete shadows /all /quiet'
        };

        await correlationEngine.evaluate(log, 'asset-3');
        expect(incidentService.createOrDedupeSystemIncident).toHaveBeenCalledWith(
            expect.objectContaining({
                rule: expect.objectContaining({ id: 'RULE_T1490_SHADOW_DELETE', assignedTier: 'L3' })
            })
        );
    });

    // ── Additional coverage ─────────────────────────────────────────────

    test('triggers T1059.001 on obfuscated PowerShell (single-event rule)', async () => {
        const log = {
            _id: 'log-ps',
            hostname: 'DEV-01',
            event_type: 'Process_Creation',
            command_line: 'powershell.exe -encodedcommand ZABpAHIA'
        };

        await correlationEngine.evaluate(log, 'asset-ps');
        expect(incidentService.createOrDedupeSystemIncident).toHaveBeenCalledWith(
            expect.objectContaining({
                rule: expect.objectContaining({ id: 'RULE_T1059_001_POWERSHELL' })
            })
        );
    });

    test('does NOT trigger T1059.001 for benign process creation', async () => {
        const log = {
            _id: 'log-benign',
            hostname: 'DEV-01',
            event_type: 'Process_Creation',
            command_line: 'notepad.exe readme.txt'
        };

        await correlationEngine.evaluate(log, 'asset-benign');
        // T1490 and T1059.001 both have threshold 1 but require regex match
        expect(incidentService.createOrDedupeSystemIncident).not.toHaveBeenCalled();
    });

    test('resets the window after a threshold trigger', async () => {
        const assetId = 'asset-reset';
        const log = { _id: 'log-r', hostname: 'PC-R', event_type: 'Auth_Failure' };

        // Trigger once (5 events)
        for (let i = 0; i < 5; i++) {
            await correlationEngine.evaluate(log, assetId);
        }
        expect(incidentService.createOrDedupeSystemIncident).toHaveBeenCalledTimes(1);

        // After trigger the window is cleared – 4 more should NOT trigger
        jest.clearAllMocks();
        for (let i = 0; i < 4; i++) {
            await correlationEngine.evaluate(log, assetId);
        }
        expect(incidentService.createOrDedupeSystemIncident).not.toHaveBeenCalled();
    });
});
