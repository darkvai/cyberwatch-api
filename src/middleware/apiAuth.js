const crypto = require('crypto');
const ApiKey = require('../models/apikeys');

exports.requireApiKey = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key.' });
    }

    const rawKey = authHeader.split(' ')[1];

    try {
        
        const incomingHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        

        const validKey = await ApiKey.findOne({ 
            key_hash: incomingHash, 
            revoked_at: null 
        });

        if (!validKey) {
            return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key.' });
        }

        req.apiConsumer = {
            id: validKey._id,
            name: validKey.consumer_name,
            scopes: validKey.scopes
        };

        next();
    } catch (error) {
        console.error('API Key Validation Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};