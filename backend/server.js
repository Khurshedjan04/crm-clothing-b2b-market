require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route modules
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const metricRoutes = require('./routes/metrics');

const app = express();

// ─── Security & Middleware ────────────────────────────────────────────────────
app.use(
  helmet({
    // Relax CSP so the frontend can load fonts, Chart.js CDN, and placeholder images
    contentSecurityPolicy: false,
  })
);
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptime: process.uptime(),
      node: process.version,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/metrics', metricRoutes);

// ─── Frontend Static Files ────────────────────────────────────────────────────
const frontendRoot = path.join(__dirname, '..', 'frontend');

// Staff/Manager dashboard at /dashboard
app.use('/dashboard', express.static(path.join(frontendRoot, 'dashboard')));
app.get('/dashboard', (req, res) =>
  res.sendFile(path.join(frontendRoot, 'dashboard', 'index.html'))
);

// Client portal — serves everything else
app.use(express.static(path.join(frontendRoot, 'client')));
app.get('*', (req, res) =>
  res.sendFile(path.join(frontendRoot, 'client', 'index.html'))
);

// ─── Error Handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();

  // Auto-seed on first run if the DB is empty
  const User = require('./models/User');
  const count = await User.countDocuments();
  if (count === 0) {
    console.log('Empty database — running seed script...');
    const { execSync } = require('child_process');
    try {
      execSync('node backend/seed/seed.js', {
        cwd: require('path').join(__dirname, '..'),
        stdio: 'inherit',
        env: process.env,
      });
    } catch (e) {
      console.warn('Seed script exited with error (may be non-fatal):', e.message);
    }
  }

  app.listen(PORT, () => {
    console.log(`ClothCo server running on http://localhost:${PORT}`);
    console.log(`  Client Portal:  http://localhost:${PORT}`);
    console.log(`  Staff Dashboard: http://localhost:${PORT}/dashboard`);
  });
};

start();
