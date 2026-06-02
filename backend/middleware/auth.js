const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { fail } = require('../utils/response');

// Verifies JWT and attaches req.user; accepts optional role list
const protect = (roles = []) => async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return fail(res, 401, 'No token provided', 'AUTH_MISSING');
  }

  const token = header.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return fail(res, 401, 'Invalid or expired token', 'AUTH_INVALID');
  }

  const user = await User.findById(decoded.id).select('-passwordHash');
  if (!user || !user.isActive) {
    return fail(res, 401, 'Account not found or deactivated', 'AUTH_INACTIVE');
  }

  // Role check — if roles array is provided, user must match one
  if (roles.length && !roles.includes(user.role)) {
    return fail(res, 403, 'Insufficient permissions', 'FORBIDDEN');
  }

  req.user = user;
  next();
};

module.exports = { protect };
