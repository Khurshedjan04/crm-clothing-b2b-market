const User = require('../models/User');
const { ok, fail } = require('../utils/response');
const audit = require('../utils/auditHelper');

exports.getUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).sort({ createdAt: -1 });
    ok(res, users, { total: users.length });
  } catch (err) { next(err); }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return fail(res, 404, 'User not found');
    ok(res, user);
  } catch (err) { next(err); }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return fail(res, 400, 'Name, email and password required');
    if (req.user.role !== 'manager' && role === 'manager')
      return fail(res, 403, 'Only managers can create manager accounts');

    const existing = await User.findOne({ email });
    if (existing) return fail(res, 409, 'Email already in use');

    const user = await User.create({ name, email, passwordHash: password, role: role || 'admin' });
    await audit(req.user, 'CREATE', 'User', user._id, { name, email, role });
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { passwordHash, ...updates } = req.body;
    if (updates.role === 'manager' && req.user.role !== 'manager')
      return fail(res, 403, 'Only managers can assign manager role');

    const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!user) return fail(res, 404, 'User not found');
    await audit(req.user, 'UPDATE', 'User', user._id, updates);
    ok(res, user);
  } catch (err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString())
      return fail(res, 400, 'Cannot deactivate your own account');
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return fail(res, 404, 'User not found');
    await audit(req.user, 'DEACTIVATE', 'User', user._id);
    ok(res, { message: 'User deactivated' });
  } catch (err) { next(err); }
};
