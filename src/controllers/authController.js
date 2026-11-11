const {loginAnalyst,registerAnalyst} =require('../services/authService.js')




module.exports.login_post = async (req, res) => {
    const { username, password } = req.body;

    try {
        // 2. Actually search the database for the user first
        const {analyst,token} = await loginAnalyst(username,password);
        
            
        res.cookie('jwt', token, { 
                httpOnly: true, 
                maxAge: 3600000 
         });
            
        return res.status(200).json({ message: 'Authentication successful', analyst: analyst.username });
        
        
        return res.status(401).json({ error: 'Invalid credentials' });

    } catch(error) {
        console.error("Login Error Details:", error); // Helpful for debugging in the terminal
        res.status(500).json({ error: 'Internal server error during login' });
    }
};