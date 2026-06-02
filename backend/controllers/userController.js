const User = require('../models/User');
const { ok, fail } = require('../utils/response');

// GET /api/v1/users — manager: list all users, optional ?role= &isActive=
exports.getUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const users = await User.find(filter).sort({ createdAt: -1 });
    ok(res, users, { total: users.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/users/:id
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return fail(res, 404, 'User not found');
    ok(res, user);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/users/staff — manager creates a staff account
exports.createStaff = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return fail(res, 400, 'Name, email and password are required');

    const existing = await User.findOne({ email });
    if (existing) return fail(res, 409, 'Email already in use');

    const user = await User.create({ name, email, passwordHash: password, role: 'staff', phone });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/users/:id — manager updates user fields
exports.updateUser = async (req, res, next) => {
  try {
    // Prevent direct password change via this endpoint
    const { passwordHash, ...updates } = req.body;

    const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!user) return fail(res, 404, 'User not found');
    ok(res, user);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/users/:id — manager deactivates (soft delete only)
exports.deactivateUser = async (req, res, next) => {
  try {
    // Prevent manager from deactivating themselves
    if (req.params.id === req.user._id.toString())
      return fail(res, 400, 'Cannot deactivate your own account');

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!user) return fail(res, 404, 'User not found');
    ok(res, { message: 'User deactivated', user });
  } catch (err) {
    next(err);
  }
};
