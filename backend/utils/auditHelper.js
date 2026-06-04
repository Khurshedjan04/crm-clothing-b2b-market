const AuditLog = require('../models/AuditLog');

const audit = async (user, action, entity, entityId, details = {}) => {
  try {
    await AuditLog.create({
      user: user?._id,
      userName: user?.name || 'System',
      action,
      entity,
      entityId,
      details,
    });
  } catch {
    // Never let audit failure break the main request
  }
};

module.exports = audit;
