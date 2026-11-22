const express = require('express');
const assetRouter = express.Router();
const {getAllAssets} = require('../controllers/assetController.js');
const {requireAuth,requireRole} = require('../middleware/authMiddleware.js');



assetRouter.get('/',requireAuth,requireRole('L1','L2','L3'),getAllAssets);
module.exports = assetRouter;