const Analyst = require('../models/analyst'); 


exports.addAnalyst = async (name,username,pass,role) =>{
     return await Analyst.create({
                name,
                username,
                password: pass,
                role,                
            });

}

exports.getAllAnalysts = async () =>{
    return await Analyst.find();
}