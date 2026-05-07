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
        default:'L1 Analyst'
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('Analyst', analystSchema);