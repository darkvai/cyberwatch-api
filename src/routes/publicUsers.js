const express = require('express');
const path = require('path');
const publicUsers = express.Router();
const {requireAuth} = require('../middleware/authMiddleware.js');
const {login_post} = require('../controllers/authController.js');

// === PUBLIC ROUTES (No Cookie Required) ===
publicUsers.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'index.html'));
});

publicUsers.post('/', login_post);

publicUsers.get('/logout',(req,res)=>{
    res.clearCookie('jwt'); // We changed from sessions to JWTs, so clear the cookie!
    res.redirect('/');
});

// === PROTECTED ROUTES (Cookie Required) ===
publicUsers.use(requireAuth); // <-- Put the bouncer here!

publicUsers.get('/dashboard',(req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'dashboard.html'));
});

publicUsers.get('/profile',(req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'profile.html'));
});

publicUsers.get('/me',(req,res)=>{
    // We update this to use the JWT payload attached by the middleware
    res.json({logged_in: true, user: req.analyst });
});

module.exports = publicUsers;