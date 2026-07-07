const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAdmin } = require('../middleware/auth');

// GET /api/admin/users - Get all users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('fetch users admin err:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/users/:id/role - Toggle user role
router.put('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.session.userId) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();
    res.json({ message: 'Role updated successfully', user: user.toSafeObject() });
  } catch (err) {
    console.error('update role admin err:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.session.userId) {
      return res.status(400).json({ error: 'You cannot delete yourself' });
    }
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('delete user admin err:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
