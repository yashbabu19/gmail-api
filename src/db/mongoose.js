const mongoose = require('mongoose');


mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/vacation-email', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});