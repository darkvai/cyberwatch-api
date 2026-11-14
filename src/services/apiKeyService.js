const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');

exports.generateApiKey = async (consumerName, scopes = ['logs:write']) => {

    const randomBytes = crypto.randomBytes(32).toString('hex');
    

    const rawKey = `cw_live_${randomBytes}`;
    
    const keyPrefix = rawKey.substring(0, 16);
    
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    
    const newKey = new ApiKey({
        key_hash: keyHash,
        key_prefix: keyPrefix,
        consumer_name: consumerName,
        scopes: scopes
    });
    
    await newKey.save();
    

    return { rawKey, keyPrefix, consumerName };
};