const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // 1. Added bcrypt import
const Analyst = require('../models/analyst'); 

const createToken = (id, username) => {
    return jwt.sign({ id, username }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

module.exports.login_post = async (req, res) => {
    const { username, password } = req.body;

    try {
        // 2. Actually search the database for the user first
        const analyst = await Analyst.findOne({ username: username });
        
        if (!analyst) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // 3. Now it is safe to compare the passwords
        const auth = await bcrypt.compare(password, analyst.password);   
        
        if (auth) {
            // 4. Use the real database ObjectId, not the mock string!
            const token = createToken(analyst._id, analyst.username);
            
            res.cookie('jwt', token, { 
                httpOnly: true, 
                maxAge: 3600000 
            });
            
            return res.status(200).json({ message: 'Authentication successful', analyst: analyst.username });
        } 
        
        return res.status(401).json({ error: 'Invalid credentials' });

    } catch(error) {
        console.error("Login Error Details:", error); // Helpful for debugging in the terminal
        res.status(500).json({ error: 'Internal server error during login' });
    }
};