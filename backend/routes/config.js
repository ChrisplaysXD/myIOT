const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { validateConfig } = require('../middleware/sanitize');


// GET /api/config - ambil thingspeak config user
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('thingspeak tokenBalance thresholds');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      channelId: user.thingspeak.channelId,
      readApiKey: user.thingspeak.readApiKey,
      tokenBalance: user.tokenBalance,
      thresholds: user.thresholds || {
        tempWarning: 26, tempAlert: 30,
        distWarning: 30, distAlert: 10,
        airWarning: 150, airAlert: 300
      }
    });
  } catch (err) {
    console.log('error get config:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// PUT /api/config - update thingspeak config
router.put('/', requireAuth, validateConfig, async (req, res) => {
  try {
    const { channelId, readApiKey } = req.body;

    const update = {};
    if (channelId !== undefined) update['thingspeak.channelId'] = channelId;
    if (readApiKey !== undefined) update['thingspeak.readApiKey'] = readApiKey;

    const user = await User.findByIdAndUpdate(
      req.session.userId,
      { $set: update },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      channelId: user.thingspeak.channelId,
      readApiKey: user.thingspeak.readApiKey
    });
  } catch (err) {
    console.log('error update config:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// PUT /api/config/tokens - update token balance
router.put('/tokens', requireAuth, async (req, res) => {
  try {
    const { tokenBalance } = req.body;

    if (typeof tokenBalance !== 'number' || tokenBalance < 0) {
      return res.status(400).json({ error: 'Invalid token balance' });
    }

    const user = await User.findByIdAndUpdate(
      req.session.userId,
      { $set: { tokenBalance } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ tokenBalance: user.tokenBalance });
  } catch (err) {
    console.log('error update tokens:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/config/thresholds - update sensor thresholds
router.put('/thresholds', requireAuth, async (req, res) => {
  try {
    const { tempWarning, tempAlert, distWarning, distAlert, airWarning, airAlert } = req.body;
    
    // validasi data kalo perlu
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (tempWarning !== undefined) user.thresholds.tempWarning = tempWarning;
    if (tempAlert !== undefined) user.thresholds.tempAlert = tempAlert;
    if (distWarning !== undefined) user.thresholds.distWarning = distWarning;
    if (distAlert !== undefined) user.thresholds.distAlert = distAlert;
    if (airWarning !== undefined) user.thresholds.airWarning = airWarning;
    if (airAlert !== undefined) user.thresholds.airAlert = airAlert;
    
    await user.save();
    
    res.json({ thresholds: user.thresholds });
  } catch (err) {
    console.log('error update thresholds:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
