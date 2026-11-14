const apiKeyService = require('../services/apiKeyService');
const ApiKey = require('../models/apikeys');

// POST /api/v1/admin/api-keys
exports.createKey = async (req, res) => {
    try {
        const { consumer_name } = req.body;
        const keyData = await apiKeyService.generateApiKey(consumer_name);
        
        // The ONLY time the raw key is ever shown
        res.status(201).json({
            message: "Store this key securely. It will never be shown again.",
            key: keyData.rawKey,
            prefix: keyData.keyPrefix,
            consumer: keyData.consumerName
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate key.' });
    }
};

// GET /api/v1/admin/api-keys
exports.listKeys = async (req, res) => {
    try {
        // Return only metadata - never the hashes, never the raw keys
        const keys = await ApiKey.find({ revoked_at: null })
                                 .select('key_prefix consumer_name scopes createdAt -_id');
        res.status(200).json(keys);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve keys.' });
    }
};