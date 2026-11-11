
const {getAllAssets} = require('../services/assetService.js')

exports.getAllAssets = async (req, res) => {
    try {
        const assets = await getAllAssets();
        res.status(200).json(assets);
    } catch (error) {
        console.error("Error fetching assets:", error);
        res.status(500).json({ error: "Failed to load assets for dropdown." });
    }
};