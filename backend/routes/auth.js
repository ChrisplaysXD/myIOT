const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { loginLimiter, signupLimiter } = require('../middleware/rateLimiter');
const { validateSignup, validateLogin } = require('../middleware/sanitize');
const { logSecurityEvent, getClientIp } = require('../middleware/securityLogger');

const LOCKOUT_ATTEMPTS = parseInt(process.env.ACCOUNT_LOCKOUT_ATTEMPTS) || 5;
const LOCKOUT_DURATION = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MS) || 900000;


// POST /api/auth/signup
router.post('/signup', signupLimiter, validateSignup, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // cek duplikat
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    const user = new User({ username, email, password });
    await user.save();

    // bikin session langsung
    req.session.regenerate((err) => {
      if (err) {
        console.log('session regenerate error on signup:', err.message);
        return res.status(500).json({ error: 'Session error' });
      }

      req.session.userId = user._id;
      req.session.save((saveErr) => {
        if (saveErr) {
          console.log('session save error:', saveErr.message);
          return res.status(500).json({ error: 'Session error' });
        }

        logSecurityEvent({
          email, ip: getClientIp(req),
          userAgent: req.headers['user-agent'],
          success: true, reason: 'signup'
        });

        res.status(201).json({ user: user.toSafeObject() });
      });
    });
  } catch (err) {
    console.log('signup error:', err.message);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /api/auth/login
router.post('/login', loginLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    const user = await User.findOne({ email });
    if (!user) {
      logSecurityEvent({ email, ip, userAgent, success: false, reason: 'user_not_found' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // cek lockout
    if (user.isLocked()) {
      const remaining = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      logSecurityEvent({ email, ip, userAgent, success: false, reason: 'account_locked' });
      return res.status(423).json({
        error: `Account locked. Try again in ${remaining} minute(s)`,
        lockedUntil: user.lockedUntil
      });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      // increment failed attempts
      user.failedLogins += 1;

      if (user.failedLogins >= LOCKOUT_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
        logSecurityEvent({ email, ip, userAgent, success: false, reason: `locked_after_${user.failedLogins}_attempts` });
      } else {
        logSecurityEvent({ email, ip, userAgent, success: false, reason: 'invalid_password' });
      }

      await user.save();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // login sukses - reset counters
    user.failedLogins = 0;
    user.lockedUntil = null;
    await user.save();

    req.session.regenerate((err) => {
      if (err) {
        console.log('session regenerate error:', err.message);
        return res.status(500).json({ error: 'Session error' });
      }

      req.session.userId = user._id;
      req.session.save((saveErr) => {
        if (saveErr) {
          console.log('session save error:', saveErr.message);
          return res.status(500).json({ error: 'Session error' });
        }

        logSecurityEvent({ email, ip, userAgent, success: true, reason: 'login' });
        res.json({ user: user.toSafeObject() });
      });
    });
  } catch (err) {
    console.log('login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log('logout error:', err.message);
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});


// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    console.log('error fetch user:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
