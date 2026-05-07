const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/cyberwatch')
  .then(() => console.log('Connected to MongoDB...'))
  .catch(err => console.error('Could not connect...', err));
  
module.exports = mongoose;