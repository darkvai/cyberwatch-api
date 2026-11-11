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
        enum: ['Open','Resolved','In Progress', 'Escalated','Flagged'],
        default: 'Open' 
    },
    // Relationships (Foreign Keys)
    analyst_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Analyst' 
    },
    escalation_reason: {
        type: String,
        default: null
    },
    // 3. New SLA tracking field
    due_at: {
        type: Date
    },
    asset_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'asset' 
    },
    log_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'LogEvent' 
    }
}, { 
    timestamps: true 
});



incidentSchema.pre('save', function(next) {
    // Only calculate this if it is a brand new ticket
    if (this.isNew) {
        const creationTime = this.createdAt || Date.now();
        let addHours = 0;

        switch (this.severity) {
            case 'Critical': addHours = 1; break;
            case 'High': addHours = 4; break;
            case 'Medium': addHours = 24; break;
            case 'Low': addHours = 48; break; // Default SLA for Low
            default: addHours = 24;
        }

        // Convert hours to milliseconds and set the due_at timestamp
        this.due_at = new Date(creationTime + (addHours * 60 * 60 * 1000));
    }
    next();
});

module.exports = mongoose.model('incident', incidentSchema);