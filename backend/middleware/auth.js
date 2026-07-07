// cek session, kalo gaada userId = 401
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

const User = require('../models/User');

async function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admins only' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

function requireAuthPage(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/auth');
  }
  next();
}

async function requireAdminPage(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/auth');
  }
  try {
    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.redirect('/');
    }
    next();
  } catch (err) {
    res.status(500).send('Server error');
  }
}

module.exports = { requireAuth, requireAdmin, requireAuthPage, requireAdminPage };
