// server.js
require('dotenv').config();
const { connect } = require('mongoose');
const connectDB = require('./src/config/NoSQLconnection.js');
const app = require('app.js');



let server;

const startServer = async () => {
    try {
        connectDB().then(() => {
        server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};
