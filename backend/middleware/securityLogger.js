const LoginAttempt = require('../models/LoginAttempt');

// log security event ke DB + console
async function logSecurityEvent(eventData) {
  try {
    const attempt = new LoginAttempt({
      email:     eventData.email || 'unknown',
      ip:        eventData.ip || 'unknown',
      userAgent: eventData.userAgent || '',
      success:   eventData.success,
      reason:    eventData.reason || ''
    });
    await attempt.save();

    // console log juga buat debugging
    const tag = eventData.success ? '✅ AUTH' : '⚠️  AUTH';
    console.log(`${tag} | ${eventData.email} | ${eventData.ip} | ${eventData.reason || 'success'}`);
  } catch (err) {
    console.log('error logging security event:', err.message);
  }
}

// extract IP dari request (handle proxy)
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown';
}

module.exports = { logSecurityEvent, getClientIp };
