const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String },
  action:   { type: String, required: true },
  entity:   { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  details:  { type: Object },
  timestamp:{ type: Date, default: Date.now },
});

module.exports = mongoose.model('AuditLog', auditSchema);
