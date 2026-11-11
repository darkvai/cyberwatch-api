require('dotenv').config();
const db = require('./src/config/NoSQLconnection.js')
const express = require('express');
const cors = require('cors');
const parser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const app = express();
const PORT = 5500;
const incidentRouter = require("./src/routes/incidentRouter.js");
const UsersRouter = require("./src/routes/publicUsers.js");
const logsRouter = require("./src/routes/logsRouter.js");

const {requireAuth} = require('./src/middleware/authMiddleware.js');

//middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: process.env.ORIGIN, // WARNING: Change this to match your frontend's actual URL!
    credentials: true                // THIS is the magic key that allows cookies to pass
}));
app.use(parser());



app.use('/v1/cyberwatch/assets', require('./src/routes/assetRouter'));
app.use("/v1/cyberwatch",logsRouter);
app.use("/v1/cyberwatch/incidents",incidentRouter);
app.use("/v1/cyberwatch",UsersRouter);
app.listen(PORT, () => {
    console.log(`[CyberWatch] Server Online at http://localhost:${PORT}`);
});