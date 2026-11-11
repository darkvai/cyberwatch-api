const { unique } = require('jquery');
const mongoose =require('mongoose');
const Schema = mongoose.Schema;

const analystSchema = new Schema({
    name:{
        type:String,
        required: true
    },
    username:{
        type:String,
        required:true,
        unique: true
    },
    password:{
      type:String,
      required: true  
    },
    role: {
        type: String,
        enum: ['L1','L2','L3'],
        default:'L1'
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('Analyst', analystSchema);