const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true },
    email:   { type: String, trim: true, lowercase: true },
    phone:   { type: String, trim: true },
    company: { type: String, trim: true },
    source:  { type: String, enum: ['website', 'referral', 'social', 'email', 'cold-call', 'other'], default: 'other' },
    status:  { type: String, enum: ['new', 'contacted', 'qualified', 'lost'], default: 'new' },
    value:   { type: Number, default: 0 },
    owner:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes:   { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lead', leadSchema);
