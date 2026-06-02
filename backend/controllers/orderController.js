const Order = require('../models/Order');
const Product = require('../models/Product');
const { ok, fail } = require('../utils/response');
const { calculateOrderTotals } = require('../utils/pricing');

// POST /api/v1/orders — client places a new order
exports.createOrder = async (req, res, next) => {
  try {
    const { items, notes } = req.body;
    if (!items || !items.length) return fail(res, 400, 'Order must contain at least one item');

    // Fetch products and validate stock
    const productIds = items.map((i) => i.product);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true });

    if (products.length !== items.length)
      return fail(res, 400, 'One or more products not found or inactive');

    // Attach full product docs to each item for pricing calculation
    const enriched = items.map((item) => ({
      ...item,
      product: products.find((p) => p._id.toString() === item.product),
    }));

    const { resolvedItems, subtotal, totalAmount } = calculateOrderTotals(enriched);

    // Build the items array with resolved unit prices
    const orderItems = resolvedItems.map((i) => ({
      product: i.product._id,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    }));

    const order = await Order.create({
      client: req.user._id,
      items: orderItems,
      subtotal,
      totalAmount,
      notes,
    });

    const populated = await order.populate(['items.product', 'client']);
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/orders — clients see own orders; staff/manager see all
exports.getOrders = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'client') filter.client = req.user._id;

    const { status, page = 1, limit = 50 } = req.query;
    if (status) filter.status = status;

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('client', 'name email companyName')
      .populate('items.product', 'name sku category')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    ok(res, orders, { total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/orders/:id
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('client', 'name email companyName phone')
      .populate('items.product', 'name sku category images');

    if (!order) return fail(res, 404, 'Order not found');

    // Clients can only access their own orders
    if (req.user.role === 'client' && order.client._id.toString() !== req.user._id.toString())
      return fail(res, 403, 'Access denied');

    ok(res, order);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/orders/:id/cancel — client cancels own pending order
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return fail(res, 404, 'Order not found');

    if (order.client.toString() !== req.user._id.toString())
      return fail(res, 403, 'You can only cancel your own orders');

    if (order.status !== 'Pending')
      return fail(res, 400, 'Only Pending orders can be cancelled');

    order.status = 'Cancelled';
    await order.save();
    ok(res, order);
  } catch (err) {
    next(err);
  }
};

// Fulfilment pipeline: Pending → Processing → Shipped → Delivered
const PIPELINE = ['Pending', 'Processing', 'Shipped', 'Delivered'];

// PATCH /api/v1/orders/:id/status — staff, manager advance status
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!PIPELINE.includes(status))
      return fail(res, 400, `Status must be one of: ${PIPELINE.join(', ')}`);

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('client', 'name email');

    if (!order) return fail(res, 404, 'Order not found');
    ok(res, order);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/orders/:id/payment — manager marks payment
exports.updatePayment = async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;
    if (!['Unpaid', 'Paid', 'Simulated'].includes(paymentStatus))
      return fail(res, 400, 'Invalid payment status');

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true }
    );
    if (!order) return fail(res, 404, 'Order not found');
    ok(res, order);
  } catch (err) {
    next(err);
  }
};
