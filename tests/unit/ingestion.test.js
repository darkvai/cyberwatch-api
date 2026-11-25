const { normalizePayload, mapSeverity } = require('../../src/services/logsIngestionService');

describe('Log Normalization Business Logic', () => {
    test('maps Winlogbeat 4625 to Auth_Failure', () => {
        const res = normalizePayload({
            body: {
                host: { hostname: 'DC-01', ip: ['10.0.0.5'] },
                event: { code: '4625', severity: 'high' },
                message: 'Failed logon'
            }
        });
        expect(res.event_type).toBe('Auth_Failure');
        expect(res.severity).toBe('High');
    });

    test('extracts command_line for Winlogbeat 4688 (T1059.001 / T1490)', () => {
        const res = normalizePayload({
            body: {
                host: { hostname: 'HR-PC' },
                event: { code: '4688' },
                process: { command_line: 'powershell -enc SQBFAFgA' }
            }
        });
        expect(res.event_type).toBe('Process_Creation');
        expect(res.command_line).toContain('-enc');
    });

    test('maps CEF deny logs to Firewall_Deny', () => {
        const res = normalizePayload({
            body: { raw: 'CEF:0|Fortinet|FortiGate|7.0|Deny|Port scan|7|src=10.0.0.9 shost=FW-01' }
        });
        expect(res.event_type).toBe('Firewall_Deny');
        expect(res.severity).toBe('High');
    });

    // ── Additional coverage ─────────────────────────────────────────────

    test('maps severity "critical" and numeric "10" to Critical', () => {
        expect(mapSeverity('critical')).toBe('Critical');
        expect(mapSeverity('10')).toBe('Critical');
        expect(mapSeverity('fatal')).toBe('Critical');
    });

    test('maps severity "medium", "warning" and numeric "5" to Medium', () => {
        expect(mapSeverity('medium')).toBe('Medium');
        expect(mapSeverity('warning')).toBe('Medium');
        expect(mapSeverity('5')).toBe('Medium');
    });

    test('maps unknown severity to Low', () => {
        expect(mapSeverity('info')).toBe('Low');
        expect(mapSeverity(undefined)).toBe('Low');
    });

    test('falls back to CyberWatch JSON format when no host or CEF', () => {
        const res = normalizePayload({
            body: {
                hostname: 'AGENT-01',
                ip_address: '192.168.1.10',
                event_type: 'USB_Insert',
                message: 'USB device inserted',
                severity: 'Low'
            }
        });
        expect(res.hostname).toBe('AGENT-01');
        expect(res.event_type).toBe('USB_Insert');
        expect(res.severity).toBe('Low');
    });

    test('extracts hostname and ip from CEF extension fields', () => {
        const res = normalizePayload({
            body: { raw: 'CEF:0|Palo Alto|PAN-OS|10|Allow|Traffic|3|src=172.16.0.5 shost=WEB-SRV' }
        });
        expect(res.hostname).toBe('WEB-SRV');
        expect(res.ip_address).toBe('172.16.0.5');
    });

    test('handles Winlogbeat 1102 (Audit_Log_Cleared)', () => {
        const res = normalizePayload({
            body: {
                host: { hostname: 'SRV-DC' },
                event: { code: '1102' },
                message: 'Audit log was cleared'
            }
        });
        expect(res.event_type).toBe('Audit_Log_Cleared');
    });
});
