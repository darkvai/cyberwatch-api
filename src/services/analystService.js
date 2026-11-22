const Analyst = require('../models/analyst'); 


exports.addAnalyst = async (username,pass) =>{
     return await Analyst.create({
                username,
                password: pass
            });

}

exports.getAllAnalysts = async () =>{
    return await Analyst.find();
}