const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    severity: { 
        type: String, 
        enum: ['Low', 'Medium', 'High', 'Critical'], // Strict enforcement
        required: true 
    },
    status: { 
        type: String, 
        default: 'Open' 
    },
    // Relationships (Foreign Keys)
    analyst_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Analyst' 
    },
    asset_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Asset' 
    },
    log_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'LogEvent' 
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('incident', incidentSchema);