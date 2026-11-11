const express = require("express");
const db = require('../config/NoSQLconnection.js')
const incidentRouter = express.Router();
const {requireAuth , requireRole} = require('../middleware/authMiddleware.js');
const { 
    getAllIncidents, 
    updateIncidentStatus,
    insertIncident,
    deleteIncident,
    getIncidentById,
    escalateIncident
} = require('../controllers/incidentController');

incidentRouter.use(requireAuth);


incidentRouter.get('/',getAllIncidents);



incidentRouter.post('/',insertIncident);

incidentRouter.put('/:id',requireRole('L2','L3'),updateIncidentStatus);

incidentRouter.put('/:id/escalate', requireRole('L2','L3'),escalateIncident)

incidentRouter.delete('/:id',requireRole('L3'),deleteIncident);


incidentRouter.get('/:id', getIncidentById);






module.exports = incidentRouter;