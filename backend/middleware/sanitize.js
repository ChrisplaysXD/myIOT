const validator = require('validator');

// validasi input signup
function validateSignup(req, res, next) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // type check - tolak kalo bukan string (anti NoSQL obj injection)
  if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid input type' });
  }

  const cleanUsername = username.trim();
  if (cleanUsername.length < 3 || cleanUsername.length > 30) {
    return res.status(400).json({ error: 'Username must be 3-30 characters' });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // sanitized values
  req.body.username = cleanUsername;
  req.body.email = validator.normalizeEmail(email);

  next();
}

// validasi input login
function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid input type' });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  req.body.email = validator.normalizeEmail(email);
  next();
}

// validasi thingspeak config
function validateConfig(req, res, next) {
  const { channelId, readApiKey } = req.body;

  if (channelId !== undefined) {
    if (typeof channelId !== 'string') {
      return res.status(400).json({ error: 'Channel ID must be a string' });
    }
    if (channelId.length > 20) {
      return res.status(400).json({ error: 'Channel ID too long' });
    }
    if (channelId && !/^[a-zA-Z0-9]+$/.test(channelId)) {
      return res.status(400).json({ error: 'Channel ID must be alphanumeric' });
    }
  }

  if (readApiKey !== undefined) {
    if (typeof readApiKey !== 'string') {
      return res.status(400).json({ error: 'API Key must be a string' });
    }
    if (readApiKey.length > 50) {
      return res.status(400).json({ error: 'API Key too long' });
    }
    if (readApiKey && !/^[a-zA-Z0-9]+$/.test(readApiKey)) {
      return res.status(400).json({ error: 'API Key must be alphanumeric' });
    }
  }

  next();
}

module.exports = { validateSignup, validateLogin, validateConfig };
