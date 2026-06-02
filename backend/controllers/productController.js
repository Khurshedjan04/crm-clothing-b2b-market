const Product = require('../models/Product');
const { ok, fail } = require('../utils/response');
const { resolveUnitPrice } = require('../utils/pricing');

// GET /api/v1/products — public, supports ?category &search &minStock &maxPrice
exports.getProducts = async (req, res, next) => {
  try {
    const { category, search, minStock, maxPrice } = req.query;
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (minStock) filter.stockLevel = { $gte: Number(minStock) };
    if (maxPrice) filter.pricePerUnit = { ...(filter.pricePerUnit || {}), $lte: Number(maxPrice) };
    if (search) filter.$text = { $search: search };

    const products = await Product.find(filter).sort({ createdAt: -1 });
    ok(res, products, { total: products.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/products/:id
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) return fail(res, 404, 'Product not found');
    ok(res, product);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/products/:id/price-tiers — returns resolved price for each qty milestone
exports.getPriceTiers = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) return fail(res, 404, 'Product not found');

    // Build a summary: default + each tier breakpoint
    const tiers = [
      { minQty: 1, pricePerUnit: product.pricePerUnit, label: 'Standard' },
      ...product.tierPricing.map((t) => ({
        minQty: t.minQty,
        pricePerUnit: t.pricePerUnit,
        label: `${t.minQty}+ units`,
      })),
    ];

    ok(res, { productId: product._id, name: product.name, tiers });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/products — staff, manager
exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/products/:id — staff, manager
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!product) return fail(res, 404, 'Product not found');
    ok(res, product);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/products/:id — manager only (soft delete)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!product) return fail(res, 404, 'Product not found');
    ok(res, { message: 'Product deactivated' });
  } catch (err) {
    next(err);
  }
};
