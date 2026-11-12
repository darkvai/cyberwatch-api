const mongoose = require('mongoose');
require('dotenv').config(); // Ensure environment variables are loaded

// Use the Docker environment variable, or fallback to localhost if you run it locally without Docker
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/cyberwatch';

mongoose.connect(mongoURI)
  .then(() => console.log(`Connected to MongoDB at ${mongoURI}...`))
  .catch(err => console.error('Could not connect to MongoDB...', err));
  
module.exports = mongoose;