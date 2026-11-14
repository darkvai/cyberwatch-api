const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
    key_hash: { type: String, required: true, unique: true },
    key_prefix: { type: String, required: true },
    consumer_name: { type: String, required: true }, // e.g., "Winlogbeat - Database Server"
    scopes: { type: [String], default: ['logs:write'] },
    revoked_at: { type: Date, default: null }
}, { timestamps: true });

// Optimize lookups specifically for active keys
apiKeySchema.index(
    { key_hash: 1 }, 
    { partialFilterExpression: { revoked_at: null } }
);

module.exports = mongoose.model('apikeys', apiKeySchema);