const Activity = require('../models/Activity');
const { ok, fail } = require('../utils/response');
const audit = require('../utils/auditHelper');

exports.getActivities = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.completed !== undefined) filter.completed = req.query.completed === 'true';
    if (req.query.owner) filter.owner = req.query.owner;
    const activities = await Activity.find(filter)
      .populate('owner', 'name')
      .populate('relatedTo')
      .sort({ dueDate: 1, createdAt: -1 });
    ok(res, activities, { total: activities.length });
  } catch (err) { next(err); }
};

exports.createActivity = async (req, res, next) => {
  try {
    const act = await Activity.create({ ...req.body, owner: req.body.owner || req.user._id });
    await audit(req.user, 'CREATE', 'Activity', act._id, { type: act.type });
    res.status(201).json({ success: true, data: act });
  } catch (err) { next(err); }
};

exports.updateActivity = async (req, res, next) => {
  try {
    const act = await Activity.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!act) return fail(res, 404, 'Activity not found');
    await audit(req.user, 'UPDATE', 'Activity', act._id, req.body);
    ok(res, act);
  } catch (err) { next(err); }
};

exports.deleteActivity = async (req, res, next) => {
  try {
    const act = await Activity.findByIdAndDelete(req.params.id);
    if (!act) return fail(res, 404, 'Activity not found');
    await audit(req.user, 'DELETE', 'Activity', act._id);
    ok(res, { message: 'Activity deleted' });
  } catch (err) { next(err); }
};
