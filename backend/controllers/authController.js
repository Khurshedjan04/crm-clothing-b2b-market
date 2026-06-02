const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ok, fail } = require('../utils/response');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/v1/auth/register — creates a client account
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, companyName, phone } = req.body;
    if (!name || !email || !password)
      return fail(res, 400, 'Name, email and password are required');

    const existing = await User.findOne({ email });
    if (existing) return fail(res, 409, 'Email already in use', 'DUPLICATE_EMAIL');

    const user = await User.create({
      name,
      email,
      passwordHash: password, // pre-save hook hashes it
      companyName,
      phone,
      role: 'client',
    });

    const token = signToken(user);
    ok(res, { token, user });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return fail(res, 400, 'Email and password are required');

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password)))
      return fail(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');

    if (!user.isActive)
      return fail(res, 403, 'Account has been deactivated', 'ACCOUNT_INACTIVE');

    const token = signToken(user);
    ok(res, { token, user });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/logout — token invalidation is client-side
exports.logout = (req, res) => ok(res, { message: 'Logged out successfully' });

// GET /api/v1/auth/me
exports.getMe = (req, res) => ok(res, { user: req.user });
