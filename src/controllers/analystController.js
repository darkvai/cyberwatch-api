const bcrypt = require('bcrypt');
const Analyst = require('../models/analyst'); 






exports.createAnalyst = async (req, res) => {
    const { username, password } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newAnalyst = await Analyst.create({
            username,
            password: hashedPassword
        });

        res.status(201).json({ 
            message: "Analyst provisioned successfully", 
            analyst: { id: newAnalyst._id, username: newAnalyst.username } 
        });
    } catch (error) {
        if(error.code ===11000 ){
            return res.status(409).json({
                error: "Username already in use"
            })
        }
console.error("System error creating analyst:", error);
        res.status(500).json({ error: "Internal server error. Could not provision Analyst." });
    }
};

exports.getAllAnalyst = async (req,res) =>{
    try{
        const analysts= await Analyst.find();
        res.status(200).json(analysts);
    }
    catch(error){
        console.error("Error fetching analysts",error);
        res.status(500).json({error : "cant get Analyst"});
    }
}
