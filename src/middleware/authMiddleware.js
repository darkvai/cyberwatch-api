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

module.exports = { requireAuth };