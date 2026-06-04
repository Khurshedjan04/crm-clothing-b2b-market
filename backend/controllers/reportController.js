const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const Activity = require('../models/Activity');
const { ok } = require('../utils/response');

exports.getSummary = async (req, res, next) => {
  try {
    const [totalCustomers, totalLeads, opportunities, activities, recentCustomers] = await Promise.all([
      Customer.countDocuments(),
      Lead.countDocuments(),
      Opportunity.find(),
      Activity.countDocuments({ completed: false }),
      Customer.countDocuments({ createdAt: { $gte: new Date(new Date().setDate(1)) } }),
    ]);

    const totalRevenue = opportunities
      .filter(o => o.stage === 'won')
      .reduce((s, o) => s + (o.amount || 0), 0);

    const pipelineValue = opportunities
      .filter(o => !['won', 'lost'].includes(o.stage))
      .reduce((s, o) => s + (o.amount || 0), 0);

    const activeLeads = await Lead.countDocuments({ status: { $in: ['new', 'contacted', 'qualified'] } });

    ok(res, { totalCustomers, totalLeads, totalRevenue, pipelineValue, activeLeads, openActivities: activities, newCustomersThisMonth: recentCustomers });
  } catch (err) { next(err); }
};

// Customer growth - last 12 months
exports.getCustomerGrowth = async (req, res, next) => {
  try {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('default', { month: 'short' }) };
    });

    const data = await Promise.all(months.map(async ({ year, month }) => {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      const count = await Customer.countDocuments({ createdAt: { $gte: start, $lt: end } });
      return count;
    }));

    ok(res, { labels: months.map(m => m.label), data });
  } catch (err) { next(err); }
};

// Opportunity pipeline by stage
exports.getPipeline = async (req, res, next) => {
  try {
    const stages = ['prospecting', 'proposal', 'negotiation', 'won', 'lost'];
    const data = await Promise.all(stages.map(async stage => {
      const opps = await Opportunity.find({ stage });
      return { stage, count: opps.length, value: opps.reduce((s, o) => s + o.amount, 0) };
    }));
    ok(res, data);
  } catch (err) { next(err); }
};

// Lead source breakdown
exports.getLeadSources = async (req, res, next) => {
  try {
    const sources = ['website', 'referral', 'social', 'email', 'cold-call', 'other'];
    const data = await Promise.all(sources.map(async source => ({
      source,
      count: await Lead.countDocuments({ source }),
    })));
    ok(res, data.filter(d => d.count > 0));
  } catch (err) { next(err); }
};

// Employee performance (opportunities won per user)
exports.getEmployeePerformance = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const users = await User.find({ isActive: true });
    const data = await Promise.all(users.map(async user => {
      const won = await Opportunity.countDocuments({ owner: user._id, stage: 'won' });
      const revenue = await Opportunity.aggregate([
        { $match: { owner: user._id, stage: 'won' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      return { name: user.name, won, revenue: revenue[0]?.total || 0 };
    }));
    ok(res, data);
  } catch (err) { next(err); }
};
