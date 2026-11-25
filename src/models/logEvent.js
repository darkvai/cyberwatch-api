const mongoose =require('mongoose');
const Schema = mongoose.Schema;

const logEventSchema = new Schema({
    asset_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'asset',
        required: true 
    },
    event_type: { 
        type: String, 
        required: true 
    },
    message: { 
        type: String, 
        required: true 
    },
    severity: { 
        type: String, 
        required: true 
    },
    command_line: { 
        type: String,
         default: null 
        }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('logEvent', logEventSchema);