const express = require("express");
const {createKey, listKeys} = require('../controllers/apiKeyController.js');
const adminRouter = express.Router();
const {requireAuth , requireRole} = require('../middleware/authMiddleware.js');

adminRouter.post('/api-keys', requireAuth, requireRole('L3'), createKey);

adminRouter.get('/api-keys',requireAuth,requireRole('L3'),listKeys);


module.exports = adminRouter;

