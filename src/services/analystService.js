const Analyst = require('../models/analyst'); 


exports.addAnalyst = async (username,pass) =>{
     return await Analyst.create({
                username,
                password: hashedPassword
            });

}

exports.getAllAnalysts = async () =>{
    return await Analyst.find();
}