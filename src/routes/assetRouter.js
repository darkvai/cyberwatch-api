const express = require('express');
const path = require('path');
const db = require('../config/NoSQLconnection.js');
const assetRouter = express.Router();
const {getAllAssets} = require('../controllers/assetController.js');


assetRouter.get('/', getAllAssets);
module.exports = assetRouter;