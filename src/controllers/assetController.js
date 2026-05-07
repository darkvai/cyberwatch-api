const Asset = require('../models/asset');

exports.getAllAssets = async (req, res) => {
    try {
        const assets = await Asset.find().select('_id hostname ip_address');
        res.status(200).json(assets);
    } catch (error) {
        console.error("Error fetching assets:", error);
        res.status(500).json({ error: "Failed to load assets for dropdown." });
    }
};