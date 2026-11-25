const Incident = require('../models/incident'); 

// Valid status transitions (Finite State Machine)
const VALID_TRANSITIONS = {
    'Open':        ['In Progress', 'Escalated', 'Resolved'],
    'In Progress': ['Escalated', 'Resolved'],
    'Escalated':   ['In Progress', 'Resolved'],
    'Resolved':    [],       // terminal state – no transitions allowed
    'Flagged':     ['Open', 'Resolved']
};

exports.allIncidents = async ()=>{
        return await Incident.find()
            .populate('asset_id', 'hostname ip_address criticality') // Only fetch specific fields
            .populate('log_id', 'event_type message severity createdAt')
            .populate('analyst_id', 'name role')
            .sort({ createdAt: -1 }); 

        
}

exports.addIncident = async (data,analyst_id) =>{
    const ticketData = {
                ...data,
                analyst_id: analyst_id 
            };
    
    let newIncident = new Incident(ticketData);
            
            // 1. Save the document to the database first
    await newIncident.save(); 
    
            // 2. Hydrate the document with the Asset data
    await newIncident.populate('asset_id', 'hostname ip_address criticality');
    
    return newIncident;
}

/**
 * Creates a new incident or deduplicates into an existing one for system-generated (correlation) alerts.
 * Uses the partial unique index (asset_id + rule_id where status ∈ [Open, In Progress, Escalated]).
 */
exports.createOrDedupeSystemIncident = async ({ rule, savedLog, assetId, logIds }) => {
    const existingIncident = await Incident.findOne({
        asset_id: assetId,
        rule_id: rule.id,
        status: { $in: ['Open', 'In Progress', 'Escalated'] }
    });

    if (existingIncident) {
        existingIncident.related_logs.push(...logIds);
        existingIncident.alert_count = (existingIncident.alert_count || 1) + 1;
        existingIncident.last_seen = new Date();
        await existingIncident.save();
        return existingIncident;
    }

    // No active ticket – create a new one (pre-save hook calculates SLA)
    return await Incident.create({
        title: `[${rule.mitre}] ${rule.name} on ${savedLog.hostname}`,
        description: `Detected ${rule.threshold} ${rule.matchEvent} events within ${rule.windowMs / 1000}s.`,
        rule_id: rule.id,
        severity: rule.severity,
        assigned_tier: rule.assignedTier,
        asset_id: assetId,
        related_logs: logIds,
        status: 'Open',
        alert_count: 1,
        last_seen: new Date(),
        tags: rule.tags || []
    });
};


exports.updateIncidentStatus = async (id, newStatus, expectedVersion) =>{
    // If a version number was supplied, use optimistic concurrency control
    if (expectedVersion !== undefined) {
        const ticket = await Incident.findById(id);
        if (!ticket) {
            const err = new Error('Incident not found');
            err.statusCode = 404;
            throw err;
        }

        // Status FSM validation
        const allowed = VALID_TRANSITIONS[ticket.status];
        if (allowed && !allowed.includes(newStatus)) {
            const err = new Error(
                `Invalid status transition: ${ticket.status} → ${newStatus}`
            );
            err.statusCode = 400;
            throw err;
        }

        if (ticket.__v !== expectedVersion) {
            const err = new Error('Conflict: document has been modified by another request');
            err.statusCode = 409;
            throw err;
        }

        ticket.status = newStatus;
        await ticket.save();   // increments __v via optimisticConcurrency
        return ticket;
    }

    // Legacy path (no version check) – still validate FSM
    const ticket = await Incident.findById(id);
    if (!ticket) {
        const err = new Error('Incident not found');
        err.statusCode = 404;
        throw err;
    }

    const allowed = VALID_TRANSITIONS[ticket.status];
    if (allowed && !allowed.includes(newStatus)) {
        const err = new Error(
            `Invalid status transition: ${ticket.status} → ${newStatus}`
        );
        err.statusCode = 400;
        throw err;
    }

    ticket.status = newStatus;
    await ticket.save();
    return ticket;
}

exports.getIncidentbyId = async (id) =>{
    return await Incident.findById(id)
                .populate('asset_id', 'hostname ip_address criticality')
                .populate('log_id', 'event_type message severity createdAt')
                .populate('analyst_id', 'name role');
    
}

exports.deleteIncident = async (id) =>{
    return await Incident.findByIdAndDelete(id);
}


exports.escalateIncident = async (id) =>{
    return await Incident.findByIdAndUpdate(
                id,
                { 
                    status: 'Escalated',
                    escalation_reason: escalation_reason 
                },
                { new: true, runValidators: true } 
            ).populate('asset_id', 'hostname ip_address')
             .populate('analyst_id', 'name role');
    
}