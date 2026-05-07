const express = require("express");
const db = require('../config/NoSQLconnection.js')
const incidentRouter = express.Router();
const {requireAuth} = require('../middleware/authMiddleware.js');
const { 
    getAllIncidents, 
    updateIncidentStatus,
    insertIncident,
    deleteIncident,
    getIncidentById
} = require('../controllers/incidentController');

incidentRouter.use(requireAuth);


incidentRouter.get('/',getAllIncidents);



incidentRouter.post('/',insertIncident);

incidentRouter.put('/:id',updateIncidentStatus);

incidentRouter.delete('/:id',deleteIncident);


incidentRouter.get('/:id', getIncidentById);






module.exports = incidentRouter;