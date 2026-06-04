const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema(
  {
    title:    { type: String, required: true, trim: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    stage:    { type: String, enum: ['prospecting', 'proposal', 'negotiation', 'won', 'lost'], default: 'prospecting' },
    amount:   { type: Number, default: 0 },
    owner:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    closeDate:{ type: Date },
    notes:    { type: String, default: '' },
    probability: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Opportunity', opportunitySchema);
