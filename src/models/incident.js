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
    rule_id: { 
        type: String, 
        index: true 
    },
    related_logs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LogEvent' }],

    alert_count: { 
        type: Number,
         default: 1 
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
    },
    tags: [{
         type: String 
        }],
    last_seen: {
         type: Date,
          default: Date.now 
        }
}, { 
    timestamps: true,
    optimisticConcurrency: true 
});

incidentSchema.index(
    { asset_id: 1, rule_id: 1 },
    {
        unique: true,
        partialFilterExpression: {
            rule_id: { $exists: true },
            status: { $in: ['Open', 'In Progress', 'Escalated'] }
        }
    }
);


incidentSchema.pre('save', function () {
    if (!this.isNew || this.due_at) return;

    const now = Date.now();
    const HOUR = 60 * 60 * 1000;

    switch (this.severity) {
        case 'Critical':
            this.due_at = new Date(now + 1 * HOUR);
            break;
        case 'High':
            this.due_at = new Date(now + 4 * HOUR);
            break;
        case 'Medium':
            this.due_at = new Date(now + 24 * HOUR);
            break;
        default:
            this.due_at = new Date(now + 48 * HOUR);
            break;
    }
});

module.exports = mongoose.model('incident', incidentSchema);