// services/correlationEngine.js
const Incident = require('../models/incident');
const rules = require('../config/correlationRules');

// Key format: `${rule.id}:${assetId}` -> Array of { time, logId }
// Abstracted here so you can swap this Map for Redis ZSETs later
const windowStore = new Map();

exports.evaluate = async (savedLog, assetId) => {
    const now = Date.now();

    // Find all rules that care about this specific event_type
    const matchingRules = rules.filter(r => r.matchEvent === savedLog.event_type);
    if (matchingRules.length === 0) return;

    for (const rule of matchingRules) {
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

            // 3. DEDUPLICATION: Check for an existing active ticket for this asset + rule
            await createOrUpdateIncident(rule, savedLog, assetId, triggeringLogIds);
        }
    }
};

async function createOrUpdateIncident(rule, savedLog, assetId, logIds) {
    try {
        const existingIncident = await Incident.findOne({
            asset_id: assetId,
            rule_id: rule.id,
            status: { $in: ['Open', 'In Progress', 'Escalated'] }
        });

        if (existingIncident) {
            // Dedupe: Append new evidence to the existing ticket instead of spamming a new one
            existingIncident.related_logs.push(...logIds);
            existingIncident.alert_count = (existingIncident.alert_count || 1) + 1;
            existingIncident.last_seen = new Date();
            await existingIncident.save();
            return;
        }

        // No active ticket exists -> Create a new one (your Mongoose hooks will calculate SLA)
        await Incident.create({
            title: `[${rule.mitre}] ${rule.name} on ${savedLog.hostname}`,
            description: `Detected ${rule.threshold} ${rule.matchEvent} events within ${rule.windowMs / 1000}s.`,
            rule_id: rule.id,
            severity: rule.severity,
            assigned_tier: rule.assignedTier,
            asset_id: assetId,
            related_logs: logIds,
            status: 'Open',
            alert_count: 1,
            last_seen: new Date()
        });
    } catch (error) {
        console.error(`Correlation Engine failed for ${rule.id}:`, error);
    }
}