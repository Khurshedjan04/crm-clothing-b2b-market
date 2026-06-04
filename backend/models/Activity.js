const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    type:  { type: String, enum: ['call', 'email', 'meeting', 'task'], required: true },
    note:  { type: String, trim: true },
    relatedTo:    { type: mongoose.Schema.Types.ObjectId, refPath: 'relatedModel' },
    relatedModel: { type: String, enum: ['Customer', 'Lead', 'Opportunity'] },
    dueDate:   { type: Date },
    completed: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', activitySchema);
