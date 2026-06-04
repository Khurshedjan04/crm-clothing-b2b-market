require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');

const connectDB      = require('./config/db');
const errorHandler   = require('./middleware/errorHandler');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── API Routes ────────────────────────────────────────────
app.use('/api/v1/auth',          require('./routes/auth'));
app.use('/api/v1/users',         require('./routes/users'));
app.use('/api/v1/customers',     require('./routes/customers'));
app.use('/api/v1/leads',         require('./routes/leads'));
app.use('/api/v1/opportunities', require('./routes/opportunities'));
app.use('/api/v1/activities',    require('./routes/activities'));
app.use('/api/v1/inventory',     require('./routes/inventory'));
app.use('/api/v1/audit',         require('./routes/audit'));
app.use('/api/v1/reports',       require('./routes/reports'));

app.get('/api/v1/health', (req, res) =>
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime(), node: process.version, environment: process.env.NODE_ENV } })
);

// ── CRM Dashboard (single frontend, served at /) ─────────
const frontendPath = path.join(__dirname, '..', 'frontend', 'dashboard');
app.use(express.static(frontendPath));
app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  const User = require('./models/User');
  const count = await User.countDocuments();
  if (count === 0) {
    console.log('Empty database — seeding...');
    const { execSync } = require('child_process');
    execSync('node backend/seed/seed.js', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: process.env,
    });
  }
  app.listen(PORT, () => {
    console.log(`CRM running → http://localhost:${PORT}`);
  });
};

start();
