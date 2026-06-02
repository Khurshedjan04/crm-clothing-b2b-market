const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  cpuUsage: { type: Number, required: true },         // percentage 0-100
  memoryUsage: { type: Number, required: true },       // percentage 0-100
  activeConnections: { type: Number, required: true },
  requestsPerSecond: { type: Number, required: true },
  region: { type: String, default: 'eu-west-1' },
  serverInstance: { type: String, required: true },
});

module.exports = mongoose.model('Metric', metricSchema);
