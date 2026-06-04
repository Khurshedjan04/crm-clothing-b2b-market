const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    email:   { type: String, trim: true, lowercase: true },
    phone:   { type: String, trim: true },
    status:  { type: String, enum: ['active', 'inactive', 'prospect'], default: 'prospect' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags:  [{ type: String }],
    notes: { type: String, default: '' },
    address:  { type: String, default: '' },
    industry: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
