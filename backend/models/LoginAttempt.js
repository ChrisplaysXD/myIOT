const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
  email:     { type: String, required: true, index: true },
  ip:        { type: String, required: true },
  userAgent: { type: String, default: '' },
  success:   { type: Boolean, required: true },
  reason:    { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, expires: 604800 } // auto-delete 7 hari
});

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
