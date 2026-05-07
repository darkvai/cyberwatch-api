const express = require("express");
const db = require('../config/db_connection.js')
const logsRouter = express.Router();
const {requireAuth} = require('../middleware/authMiddleware.js');
const {receiveLog,
    getLogs
} = require('../controllers/logController.js');


logsRouter.use(requireAuth);

logsRouter.get('/',getLogs);
logsRouter.post('/',receiveLog);

module.exports = logsRouter;