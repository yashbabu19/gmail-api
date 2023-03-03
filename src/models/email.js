const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
    id: String,
    threadId: String,
    from: String,
    subject: String,
    body: String,
    sentByMe: Boolean,
  });
  
  const Email = mongoose.model('Email', emailSchema);
  
module.exports = Email;