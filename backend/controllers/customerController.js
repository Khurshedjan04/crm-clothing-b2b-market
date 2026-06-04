const Customer = require('../models/Customer');
const { ok, fail } = require('../utils/response');
const audit = require('../utils/auditHelper');

exports.getCustomers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
    if (req.query.search) {
      const re = new RegExp(req.query.search, 'i');
      filter.$or = [{ name: re }, { company: re }, { email: re }];
    }
    const customers = await Customer.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    ok(res, customers, { total: customers.length });
  } catch (err) { next(err); }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name');
    if (!customer) return fail(res, 404, 'Customer not found');
    ok(res, customer);
  } catch (err) { next(err); }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.create({ ...req.body, createdBy: req.user._id });
    await audit(req.user, 'CREATE', 'Customer', customer._id, { name: customer.name });
    res.status(201).json({ success: true, data: customer });
  } catch (err) { next(err); }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!customer) return fail(res, 404, 'Customer not found');
    await audit(req.user, 'UPDATE', 'Customer', customer._id, req.body);
    ok(res, customer);
  } catch (err) { next(err); }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return fail(res, 404, 'Customer not found');
    await audit(req.user, 'DELETE', 'Customer', customer._id);
    ok(res, { message: 'Customer deleted' });
  } catch (err) { next(err); }
};
