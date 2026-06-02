const Metric = require('../models/Metric');
const { ok } = require('../utils/response');

const INSTANCES = ['i-0a1b2c3d', 'i-0e4f5a6b', 'i-0c7d8e9f'];
const REGIONS = ['eu-west-1', 'us-east-1', 'ap-southeast-1'];

// Generates realistic-looking metric values with slight random variance
function generateSnapshot(base = {}) {
  const instance = INSTANCES[Math.floor(Math.random() * INSTANCES.length)];
  const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];

  return {
    cpuUsage: Math.min(99, Math.max(5, (base.cpu || 45) + (Math.random() * 20 - 10))),
    memoryUsage: Math.min(95, Math.max(20, (base.mem || 60) + (Math.random() * 15 - 7))),
    activeConnections: Math.floor(Math.random() * 120) + 20,
    requestsPerSecond: Math.round((Math.random() * 80 + 10) * 10) / 10,
    region,
    serverInstance: instance,
    timestamp: new Date(),
  };
}

// GET /api/v1/metrics/live — last 20 snapshots
exports.getLiveMetrics = async (req, res, next) => {
  try {
    const metrics = await Metric.find().sort({ timestamp: -1 }).limit(20);
    ok(res, metrics.reverse()); // oldest-first for charts
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/metrics/simulate — generate and persist a new snapshot
exports.simulateMetric = async (req, res, next) => {
  try {
    // Spike mode: higher values to simulate load
    const spike = req.body && req.body.spike;
    const base = spike ? { cpu: 85, mem: 78 } : {};
    const metric = await Metric.create(generateSnapshot(base));
    ok(res, metric);
  } catch (err) {
    next(err);
  }
};

module.exports.generateSnapshot = generateSnapshot;
