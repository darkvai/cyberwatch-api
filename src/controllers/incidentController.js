const Incident = require('../models/incident'); // <-- Notice the two dots
// @desc    Get all incidents for the SOC Dashboard
// @route   GET /api/incidents
exports.getAllIncidents = async (req, res) => {
    try {
        // Fetch incidents and JOIN the related data
        const incidents = await Incident.find()
            .populate('asset_id', 'hostname ip_address criticality') // Only fetch specific fields
            .populate('log_id', 'event_type message severity createdAt')
            .populate('analyst_id', 'name role')
            .sort({ createdAt: -1 }); // Sort by newest first

        res.status(200).json(incidents);
    } catch (error) {
        console.error("Error fetching incidents:", error);
        res.status(500).json({ error: 'Server error retrieving incidents.' });
    }
};



exports.insertIncident = async (req, res) => {
    try {
        const ticketData = {
            ...req.body,
            analyst_id: req.analyst.id 
        };

        let newIncident = new Incident(ticketData);
        
        // 1. Save the document to the database first
        await newIncident.save(); 

        // 2. Hydrate the document with the Asset data
        await newIncident.populate('asset_id', 'hostname ip_address criticality');

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
        const validStatuses = ['Open',  'Resolved'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status provided.' });
        }

        const incident = await Incident.findByIdAndUpdate(
            id,
            { status: status },
            { new: true, runValidators: true } // Return updated doc & run schema validation
        );

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
        const deletedIncident = await Incident.findByIdAndDelete(id);
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
        const incident = await Incident.findById(id)
            .populate('asset_id', 'hostname ip_address criticality')
            .populate('log_id', 'event_type message severity createdAt')
            .populate('analyst_id', 'name role');

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
