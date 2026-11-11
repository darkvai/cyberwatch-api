const Incident = require('../models/incident'); 

exports.allIncidents = async ()=>{
        return await Incident.find()
            .populate('asset_id', 'hostname ip_address criticality') // Only fetch specific fields
            .populate('log_id', 'event_type message severity createdAt')
            .populate('analyst_id', 'name role')
            .sort({ createdAt: -1 }); 

        
}

exports.addIncident = async (req) =>{
    const ticketData = {
                ...req.body,
                analyst_id: req.analyst.id 
            };
    
    let newIncident = new Incident(ticketData);
            
            // 1. Save the document to the database first
    await newIncident.save(); 
    
            // 2. Hydrate the document with the Asset data
    await newIncident.populate('asset_id', 'hostname ip_address criticality');
    
    return newIncident;
}


exports.updateIncidentStatus = async (id,newStatus) =>{
    return await Incident.findByIdAndUpdate(
        id, 
        { status: newStatus }, 
        { new: true, runValidators: true }
    );
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