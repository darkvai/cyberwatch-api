

const {allIncidents, addInicident , updateIncidentStatus , getIncidentById,deleteIncident, escalateIncident} = require('../services/logsIngestionService.js')

// @desc    Get all incidents for the SOC Dashboard
// @route   GET /api/incidents
exports.getAllIncidents = async (req, res) => {
    try {
        // Fetch incidents and JOIN the related data
        const incidents = await allIncidents();// Sort by newest first

        res.status(200).json(incidents);
    } catch (error) {
        console.error("Error fetching incidents:", error);
        res.status(500).json({ error: 'Server error retrieving incidents.' });
    }
};



exports.insertIncident = async (req, res) => {
    try {
     
        let newIncident = addIncident(req);

        res.status(201).json({ 
            message: 'Ticket added successfully', 
            incident: newIncident 
        });

    } catch(error) {
        console.error("An error occurred", error);
        res.status(500).json({ message: "Can't Insert Incident", details: error.message });
    }
}

// @desc    Update incident status (e.g., from Open to Resolved)
// @route   PATCH /api/incidents/:id/status
exports.updateIncidentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate the status input
        const validStatuses = ['Open','Resolved','In Progress','Flagged'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status provided.' });
        }

        const incident = await updateIncidentStatus(id,status);


        if (!incident) {
            return res.status(404).json({ error: 'Incident not found.' });
        }

        res.status(200).json(incident);
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ error: 'Server error updating incident.' });
    }
};


exports.deleteIncident = async (req,res) => {
    try{
        let {id} = req.params;
        const deletedIncident = await deleteIncident(id);
        if(!deletedIncident){
            return res.status(404).json({error : 'Inicident not found'});
        };
        res.status(200).json({
            message: 'Incident successfully deleted',
            deletedId: deletedIncident._id
        });
}
    catch(error){
        res.status(500).json({error : "Server couldn't delete incident"});
    }

}


exports.getIncidentById = async (req, res) => {
    try {
        // Extract the ID from the URL parameters (e.g., /api/incidents/65b9d...)
        const { id } = req.params;

        // Fetch the incident and hydrate the relationships
        const incident = await getIncidentById(id);

        // If no incident matches the ID, return a 404 Not Found
        if (!incident) {
            return res.status(404).json({ message: 'Incident not found.' });
        }

        // Return the fully populated incident
        res.status(200).json(incident);

    } catch (error) {
        console.error("Error fetching incident by ID:", error);

        // Handle the specific case where the provided ID format is completely invalid
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid Incident ID format.' });
        }

        res.status(500).json({ message: "Server error retrieving the incident." });
    }
};

// @desc    Escalate an incident to the next tier
// @route   PUT /api/incidents/:id/escalate
exports.escalateIncident = async (req, res) => {
    try {
        const { id } = req.params;
        const { escalation_reason } = req.body;

        // 1. Enforce the required reason
        if (!escalation_reason || escalation_reason.trim() === '') {
            return res.status(400).json({ 
                error: 'Validation failed: An escalation reason is strictly required.' 
            });
        }

        // 2. Find and update the ticket simultaneously
        const escalatedIncident = await escalateIncident(id);
        // 3. Handle 404 if the ID doesn't exist
        if (!escalatedIncident) {
            return res.status(404).json({ error: 'Incident not found.' });
        }

        // 4. Return success
        res.status(200).json({
            message: 'Incident successfully escalated.',
            incident: escalatedIncident
        });

    } catch (error) {
        console.error("Error escalating incident:", error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid Incident ID format.' });
        }
        
        res.status(500).json({ error: 'Server error during escalation process.' });
    }
};
