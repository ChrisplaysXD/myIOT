const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    match: /^\S+@\S+\.\S+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  thingspeak: {
    channelId:  { type: String, default: '', maxlength: 20 },
    readApiKey: { type: String, default: '', maxlength: 50 }
  },
  thresholds: {
    tempWarning: { type: Number, default: 26 },
    tempAlert: { type: Number, default: 30 },
    distWarning: { type: Number, default: 30 },
    distAlert: { type: Number, default: 10 },
    airWarning: { type: Number, default: 150 },
    airAlert: { type: Number, default: 300 },
    humidWarning: { type: Number, default: 70 },
    humidAlert: { type: Number, default: 85 }
  },
  tokenBalance: { type: Number, default: 1000 },
  lockedUntil:  { type: Date, default: null },
  failedLogins: { type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now }
});


// hash password sebelum save, skip kalo ga berubah
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// compare password helper
userSchema.methods.comparePassword = async function(candidatePass) {
  return bcrypt.compare(candidatePass, this.password);
};

// cek apakah akun lagi di-lock
userSchema.methods.isLocked = function() {
  if (!this.lockedUntil) return false;
  return this.lockedUntil > new Date();
};

// strip password dari JSON output
userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
