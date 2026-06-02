const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    invoiceNumber: { type: String, unique: true },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Paid', 'Simulated'],
      default: 'Unpaid',
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Auto-generate invoice number before first save
orderSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Order').countDocuments();
    const pad = String(count + 1).padStart(5, '0');
    this.invoiceNumber = `INV-${new Date().getFullYear()}-${pad}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
