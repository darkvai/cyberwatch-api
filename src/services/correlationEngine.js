// services/correlationEngine.js
const rules = require('../config/correlationRules');
const incidentService = require('./incidentService');

// Key format: `${rule.id}:${assetId}` -> Array of { time, logId }
// Abstracted here so you can swap this Map for Redis ZSETs later
const windowStore = new Map();

exports.evaluate = async (savedLog, assetId) => {
    const now = Date.now();

    // Find all rules that care about this specific event_type
    const matchingRules = rules.filter(r => r.matchEvent === savedLog.event_type);
    if (matchingRules.length === 0) return;

    for (const rule of matchingRules) {
        // If the rule has a regex pattern, the log must match it
        if (rule.matchPattern && !rule.matchPattern.test(savedLog.command_line || '')) {
            continue;
        }

        const key = `${rule.id}:${assetId}`;
        const entries = windowStore.get(key) || [];

        // 1. Add current event and prune anything outside the sliding window
        entries.push({ time: now, logId: savedLog._id });
        const activeEntries = entries.filter(e => now - e.time <= rule.windowMs);
        windowStore.set(key, activeEntries);

        // 2. Check threshold
        if (activeEntries.length >= rule.threshold) {
            const triggeringLogIds = activeEntries.map(e => e.logId);

            // Clear the window immediately to reset the counter
            windowStore.delete(key);

            // 3. Delegate dedup + creation to incidentService
            await incidentService.createOrDedupeSystemIncident({
                rule,
                savedLog,
                assetId,
                logIds: triggeringLogIds
            });
        }
    }
};