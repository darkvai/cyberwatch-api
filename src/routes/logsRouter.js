const express = require("express");
const logsRouter = express.Router();
const {requireAuth, requireRole} = require('../middleware/authMiddleware.js');
const { requireApiKey } = require('../middleware/apiAuth');
const {receiveLog,
    getLogs
} = require('../controllers/logController.js');



logsRouter.get('/',requireAuth,requireRole('L1','L2','L3'),getLogs);
logsRouter.post('/',requireApiKey,receiveLog);

module.exports = logsRouter;