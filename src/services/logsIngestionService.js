const LogEvent = require('../models/logEvent');
const {evaluate} = require('../services/ccorrelationEngine.js')


const WIN_EVENT_MAP = {
    '4625': 'Auth_Failure',
    '4688': 'Process_Creation',
    '4104': 'Process_Creation',
    '1102': 'Audit_Log_Cleared'
};

exports.normalizePayload = (req) => {
    const payload = req.body;

    // 1. Windows Event Log (via Logstash/Winlogbeat JSON)
    if (payload.winlog || payload.host) {
        const code = String(payload.event?.code || payload.winlog?.event_id || '');
        return {
            hostname: payload.host?.hostname || payload.winlog?.computer_name || 'unknown-win-host',
            ip_address: payload.host?.ip?.[0] || '0.0.0.0',
            event_type: WIN_EVENT_MAP[code] || payload.event?.action || code || 'WinEvent',
            message: payload.message || 'Windows Event Log Triggered',
            severity: exports.mapSeverity(payload.log?.level || payload.event?.severity),
            command_line: payload.process?.command_line || payload.winlog?.event_data?.CommandLine || null,
        };
    }

    // 2. CEF (Common Event Format)
    if (payload.raw && payload.raw.startsWith('CEF:')) {
        const parts = payload.raw.split('|');
        const extensionStr = parts.slice(7).join('|'); 
        
        const extract = (key) => {
            const match = extensionStr.match(new RegExp(`${key}=([^\\s]+)`));
            return match ? match[1] : null;
        };

        return {
            hostname: extract('shost') || 'unknown-cef-host',
            ip_address: extract('src') || '0.0.0.0',
            event_type: /deny|drop|block/i.test(`${parts[4]} ${parts[5]}`) ? 'Firewall_Deny' : (parts[4] || 'CEF_Event'),            message: parts[5] || 'CEF Log Triggered',
            severity: exports.mapSeverity(parts[6])
        };
    }

    // 3. Fallback to original CyberWatch JSON (Python Agent)
    return {
        hostname: payload.hostname,
        ip_address: payload.ip_address,
        event_type: payload.event_type,
        message: payload.message,
        severity: payload.severity
    };
};




// Map external severities to CyberWatch enums
exports.mapSeverity = (extSeverity) => {
    const normalized = String(extSeverity).toLowerCase();
    if (['critical', 'fatal', '10', '9', '8'].includes(normalized)) return 'Critical';
    if (['high', 'error', '7', '6'].includes(normalized)) return 'High';
    if (['medium', 'warning', 'warn', '5', '4'].includes(normalized)) return 'Medium';
    return 'Low';
};


exports.saveLog = async (asset, { event_type, message, severity, command_line })=>{
    const newLog = new LogEvent({
                asset_id: asset._id, 
                event_type: event_type,
                message: message,
                severity: severity,
                ...(command_line && { command_line })
            });

            
    
            const savedLog = await newLog.save();
            try {
                await evaluate(savedLog, asset);
            } catch (err) {
                console.error(`Correlation failed for log ${savedLog._id}:`, err);
            }

            return savedLog;

}

exports.searchLog = async ()=>{
        const logs = await LogEvent.find()
            .populate('asset_id', 'hostname ip_address')
            .sort({ createdAt: -1 })
            .limit(100); 

        return logs;

}

