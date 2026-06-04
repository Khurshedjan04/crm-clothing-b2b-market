const Opportunity = require('../models/Opportunity');
const { ok, fail } = require('../utils/response');
const audit = require('../utils/auditHelper');

exports.getOpportunities = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.stage) filter.stage = req.query.stage;
    if (req.query.owner) filter.owner = req.query.owner;
    const opps = await Opportunity.find(filter)
      .populate('customer', 'name company')
      .populate('owner', 'name')
      .sort({ createdAt: -1 });
    ok(res, opps, { total: opps.length });
  } catch (err) { next(err); }
};

exports.getOpportunity = async (req, res, next) => {
  try {
    const opp = await Opportunity.findById(req.params.id)
      .populate('customer', 'name company email')
      .populate('owner', 'name email');
    if (!opp) return fail(res, 404, 'Opportunity not found');
    ok(res, opp);
  } catch (err) { next(err); }
};

exports.createOpportunity = async (req, res, next) => {
  try {
    const opp = await Opportunity.create({ ...req.body, owner: req.body.owner || req.user._id });
    await audit(req.user, 'CREATE', 'Opportunity', opp._id, { title: opp.title });
    res.status(201).json({ success: true, data: opp });
  } catch (err) { next(err); }
};

exports.updateOpportunity = async (req, res, next) => {
  try {
    const opp = await Opportunity.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!opp) return fail(res, 404, 'Opportunity not found');
    await audit(req.user, 'UPDATE', 'Opportunity', opp._id, req.body);
    ok(res, opp);
  } catch (err) { next(err); }
};

exports.deleteOpportunity = async (req, res, next) => {
  try {
    const opp = await Opportunity.findByIdAndDelete(req.params.id);
    if (!opp) return fail(res, 404, 'Opportunity not found');
    await audit(req.user, 'DELETE', 'Opportunity', opp._id);
    ok(res, { message: 'Opportunity deleted' });
  } catch (err) { next(err); }
};
