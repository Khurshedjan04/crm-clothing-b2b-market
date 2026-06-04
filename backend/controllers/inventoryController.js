const InventoryItem = require('../models/InventoryItem');
const { ok, fail } = require('../utils/response');
const audit = require('../utils/auditHelper');

exports.getItems = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.lowStock === 'true') filter.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };
    if (req.query.search) {
      const re = new RegExp(req.query.search, 'i');
      filter.$or = [{ productName: re }, { sku: re }, { category: re }];
    }
    const items = await InventoryItem.find(filter).sort({ productName: 1 });
    ok(res, items, { total: items.length });
  } catch (err) { next(err); }
};

exports.createItem = async (req, res, next) => {
  try {
    const item = await InventoryItem.create(req.body);
    await audit(req.user, 'CREATE', 'InventoryItem', item._id, { sku: item.sku });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
};

exports.updateItem = async (req, res, next) => {
  try {
    const item = await InventoryItem.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!item) return fail(res, 404, 'Item not found');
    await audit(req.user, 'UPDATE', 'InventoryItem', item._id, req.body);
    ok(res, item);
  } catch (err) { next(err); }
};

exports.deleteItem = async (req, res, next) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!item) return fail(res, 404, 'Item not found');
    await audit(req.user, 'DELETE', 'InventoryItem', item._id);
    ok(res, { message: 'Item deleted' });
  } catch (err) { next(err); }
};
