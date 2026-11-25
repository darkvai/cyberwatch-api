const express = require('express');
const path = require('path');
const publicUsers = express.Router();
const {requireAuth} = require('../middleware/authMiddleware.js');
const {login_post} = require('../controllers/authController.js');
const rateLimit = require('express-rate-limit');


const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per window
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true, 
    legacyHeaders: false, 
});




publicUsers.post('/',loginLimiter ,login_post);

publicUsers.get('/logout',(req,res)=>{
    res.clearCookie('jwt'); 
    res.redirect('/');
});

// === PROTECTED ROUTES (Cookie Required) ===
publicUsers.use(requireAuth); // <-- Put the bouncer here!


publicUsers.get('/me',(req,res)=>{
    // We update this to use the JWT payload attached by the middleware
    res.json({logged_in: true, user: req.analyst });
});

module.exports = publicUsers;