const AuditLog = require('../models/AuditLog');
const { ok } = require('../utils/response');

exports.getLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const filter = {};
    if (req.query.entity) filter.entity = req.query.entity;
    if (req.query.user) filter.user = req.query.user;
    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('user', 'name email')
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    ok(res, logs, { total, page, limit });
  } catch (err) { next(err); }
};
