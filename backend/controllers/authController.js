const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ok, fail } = require('../utils/response');
const audit = require('../utils/auditHelper');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return fail(res, 400, 'Email and password required');

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password)))
      return fail(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    if (!user.isActive) return fail(res, 403, 'Account deactivated', 'ACCOUNT_INACTIVE');

    await audit(user, 'LOGIN', 'User', user._id);
    ok(res, { token: signToken(user), user });
  } catch (err) { next(err); }
};

exports.logout = async (req, res) => {
  if (req.user) await audit(req.user, 'LOGOUT', 'User', req.user._id);
  ok(res, { message: 'Logged out' });
};

exports.getMe = (req, res) => ok(res, { user: req.user });
