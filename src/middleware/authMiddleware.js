const jwt = require('jsonwebtoken');

const requireAuth = (req,res,next) =>{
    const token = req.cookies?.jwt;
    if(token){
        jwt.verify(token,process.env.JWT_SECRET, (err, decodedToken) =>{
            if(err) {
                console.log('Verification Failed:',err.message);
                return res.status(401).json({error : 'Unauthorized'})
            } else {
                req.analyst = decodedToken;
                next();
            }
        })
    }
    else {
return res.status(401).json({ error: 'Unauthorized: No token provided' });    }


    }

const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        // 1. Safety check: Ensure the token was decoded properly
        if (!req.analyst || !req.analyst.role) {
            return res.status(403).json({ 
                error: 'Forbidden: Role missing from session token. Please log in again.' 
            });
        }

        // 2. Authorization check: Does their role exist in the allowed list?
        if (allowedRoles.includes(req.analyst.role)) {
            next(); // They have clearance, proceed to the controller
        } else {
            // 3. Rejection
            res.status(403).json({ 
                error: `Access Denied: Your current role (${req.analyst.role}) lacks the required clearance for this action.` 
            });
        }
    };
};

module.exports = { requireAuth , requireRole };