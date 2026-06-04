const Lead = require('../models/Lead');
const { ok, fail } = require('../utils/response');
const audit = require('../utils/auditHelper');

exports.getLeads = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.owner) filter.owner = req.query.owner;
    if (req.query.search) {
      const re = new RegExp(req.query.search, 'i');
      filter.$or = [{ name: re }, { company: re }, { email: re }];
    }
    const leads = await Lead.find(filter).populate('owner', 'name').sort({ createdAt: -1 });
    ok(res, leads, { total: leads.length });
  } catch (err) { next(err); }
};

exports.getLead = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('owner', 'name email');
    if (!lead) return fail(res, 404, 'Lead not found');
    ok(res, lead);
  } catch (err) { next(err); }
};

exports.createLead = async (req, res, next) => {
  try {
    const lead = await Lead.create({ ...req.body, owner: req.body.owner || req.user._id });
    await audit(req.user, 'CREATE', 'Lead', lead._id, { name: lead.name });
    res.status(201).json({ success: true, data: lead });
  } catch (err) { next(err); }
};

exports.updateLead = async (req, res, next) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!lead) return fail(res, 404, 'Lead not found');
    await audit(req.user, 'UPDATE', 'Lead', lead._id, req.body);
    ok(res, lead);
  } catch (err) { next(err); }
};

exports.deleteLead = async (req, res, next) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return fail(res, 404, 'Lead not found');
    await audit(req.user, 'DELETE', 'Lead', lead._id);
    ok(res, { message: 'Lead deleted' });
  } catch (err) { next(err); }
};
