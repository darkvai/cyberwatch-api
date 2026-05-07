const mongoose =require('mongoose');
const Schema = mongoose.Schema;

const assetSchema = new Schema({
    hostname: {
        type:String,
        required: true,
        index:true
    },
    ip_address: {
        type: String,
        required: true
    },
    criticality: {
        type: String,
        default: 'Medium'
    }

} , {
    timestamps: true
})


module.exports = mongoose.model('asset', assetSchema);