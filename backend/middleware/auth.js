const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { fail } = require('../utils/response');

// Verifies JWT, attaches req.user, optionally checks role
const protect = (roles = []) => async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return fail(res, 401, 'No token provided', 'AUTH_MISSING');

  let decoded;
  try {
    decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    return fail(res, 401, 'Invalid or expired token', 'AUTH_INVALID');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) return fail(res, 401, 'Account not found or deactivated', 'AUTH_INACTIVE');

  if (roles.length && !roles.includes(user.role))
    return fail(res, 403, 'Insufficient permissions', 'FORBIDDEN');

  req.user = user;
  next();
};

module.exports = { protect };
