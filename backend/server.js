require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const path = require('path');

const { globalLimiter } = require('./middleware/rateLimiter');
const { requireAuthPage, requireAdminPage } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const configRoutes = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/energy_dashboard';


// ============ SECURITY MIDDLEWARE ============

// helmet - security headers + CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.thingspeak.com"],
      imgSrc: ["'self'", "data:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  }
}));

// rate limiter global
app.use(globalLimiter);

// body parser - limit 10kb biar ga bisa flood
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// cookie parser (buat CSRF double submit)
app.use(cookieParser());

// strip $ dan . dari input - anti NoSQL injection
app.use(mongoSanitize());


// ============ SESSION ============

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    collectionName: 'sessions',
    ttl: 2 * 60 * 60 // 2 jam
  }),
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: false, // ubah jadi false biar jalan di localhost (HTTP)
    maxAge: 1000 * 60 * 60 * 2 // 2 jam
  }
}));


// ============ ROUTES ============

app.use('/api/auth', authRoutes);
app.use('/api/config', configRoutes);
app.use('/api/admin', require('./routes/admin'));

// serve frontend static files (CSS, JS, Images) - don't serve HTML directly if possible, but express.static does by default.
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// MPA Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

app.get('/dashboard', requireAuthPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/config', requireAuthPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'config.html'));
});

app.get('/admin', requireAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Fallback for missing routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API route not found' });
  } else {
    res.redirect('/');
  }
});

// global error handler
app.use((err, req, res, next) => {
  console.log('unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});


// ============ START ============

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected');

    // Seed admin user
    const User = require('./models/User');
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const adminUser = new User({
        username: 'admin',
        email: 'admin@myiot.local',
        password: 'admin123',
        role: 'admin'
      });
      await adminUser.save();
      console.log('✅ Default Admin user created (admin:admin123)');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.log('failed to start:', err.message);
    process.exit(1);
  }
}

start();
