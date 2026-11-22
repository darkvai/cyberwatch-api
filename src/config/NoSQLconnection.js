const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/cyberwatch';
  try {
    await mongoose.connect(mongoURI);
    console.log(`Connected to MongoDB at ${mongoURI}...`);
  } catch (err) {
    console.error('Could not connect to MongoDB...', err);
    process.exit(1); // Stop the app if DB connection fails
  }
};

module.exports = connectDB;