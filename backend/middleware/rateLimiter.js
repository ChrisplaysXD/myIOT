const rateLimit = require('express-rate-limit');

// global limiter disabled
const globalLimiter = (req, res, next) => next();

// login limiter disabled
const loginLimiter = (req, res, next) => next();

// signup limiter disabled
const signupLimiter = (req, res, next) => next();

module.exports = { globalLimiter, loginLimiter, signupLimiter };
