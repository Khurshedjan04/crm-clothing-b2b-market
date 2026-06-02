require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Metric = require('../models/Metric');
const { generateSnapshot } = require('../controllers/metricController');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/clothco';

// ─── Seed Data ────────────────────────────────────────────────────────────────

const USERS = [
  // Manager
  { name: 'Admin User', email: 'admin@clothco.com', password: 'Admin1234!', role: 'manager', companyName: 'ClothCo HQ', phone: '+44 20 0000 0001' },
  // Staff
  { name: 'Sarah Mitchell', email: 'staff1@clothco.com', password: 'Staff1234!', role: 'staff', phone: '+44 20 0000 0011' },
  { name: 'James Okonkwo', email: 'staff2@clothco.com', password: 'Staff1234!', role: 'staff', phone: '+44 20 0000 0012' },
  { name: 'Priya Sharma',  email: 'staff3@clothco.com', password: 'Staff1234!', role: 'staff', phone: '+44 20 0000 0013' },
  // Clients
  { name: 'Marcus Webb',      email: 'client1@clothco.com', password: 'Client1234!', role: 'client', companyName: 'Webb Streetwear Ltd',     phone: '+44 161 000 0001' },
  { name: 'Elena Vasquez',    email: 'client2@clothco.com', password: 'Client1234!', role: 'client', companyName: 'Vasquez Fashion Group',   phone: '+44 161 000 0002' },
  { name: 'Tom Hendricks',    email: 'client3@clothco.com', password: 'Client1234!', role: 'client', companyName: 'Hendricks Retail Co',     phone: '+44 161 000 0003' },
  { name: 'Aisha Conteh',     email: 'client4@clothco.com', password: 'Client1234!', role: 'client', companyName: 'Conteh Wholesale',        phone: '+44 161 000 0004' },
  { name: 'Dmitri Volkov',    email: 'client5@clothco.com', password: 'Client1234!', role: 'client', companyName: 'Volkov Import & Apparel', phone: '+44 161 000 0005' },
];

const PRODUCTS = [
  // Hoodies
  { name: 'Classic Pullover Hoodie', category: 'Hoodies', sku: 'HOD-001', description: 'Heavyweight 450gsm fleece pullover hoodie, unisex fit, reinforced stitching.', pricePerUnit: 14, tierPricing: [{ minQty: 50, pricePerUnit: 12 }, { minQty: 200, pricePerUnit: 10 }], stockLevel: 340, warehouseLocation: 'Bin A-01, Warehouse 1', images: ['https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&h=750&fit=crop&auto=format'] },
  { name: 'Zip-Up Logo Hoodie', category: 'Hoodies', sku: 'HOD-002', description: 'Full-zip hoodie with embroidered chest logo, kangaroo pocket, drawstring hood.', pricePerUnit: 16, tierPricing: [{ minQty: 50, pricePerUnit: 13.5 }, { minQty: 200, pricePerUnit: 11 }], stockLevel: 215, warehouseLocation: 'Bin A-02, Warehouse 1', images: ['https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&h=750&fit=crop&auto=format'] },
  { name: 'Oversized Drop-Shoulder Hoodie', category: 'Hoodies', sku: 'HOD-003', description: 'Relaxed oversized silhouette, drop shoulder, 380gsm brushed cotton.', pricePerUnit: 15, tierPricing: [{ minQty: 50, pricePerUnit: 12.5 }, { minQty: 200, pricePerUnit: 10.5 }], stockLevel: 18, warehouseLocation: 'Bin A-03, Warehouse 1', images: ['https://images.unsplash.com/photo-1509942774463-acf339cf87d5?w=600&h=750&fit=crop&auto=format'] },

  // Cargo Pants
  { name: 'Tactical Cargo Pants', category: 'Cargo Pants', sku: 'CGO-001', description: 'Six-pocket tactical cargo, ripstop fabric, adjustable ankle cuffs.', pricePerUnit: 22, tierPricing: [{ minQty: 30, pricePerUnit: 19 }, { minQty: 100, pricePerUnit: 16 }], stockLevel: 180, warehouseLocation: 'Bin B-01, Warehouse 1', images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=750&fit=crop&auto=format'] },
  { name: 'Slim-Fit Cargo Chino', category: 'Cargo Pants', sku: 'CGO-002', description: 'Refined slim-fit cargo silhouette, stretch cotton blend, side cargo pockets.', pricePerUnit: 20, tierPricing: [{ minQty: 30, pricePerUnit: 17 }, { minQty: 100, pricePerUnit: 14.5 }], stockLevel: 95, warehouseLocation: 'Bin B-02, Warehouse 1', images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&h=750&fit=crop&auto=format'] },
  { name: 'Wide-Leg Parachute Cargo', category: 'Cargo Pants', sku: 'CGO-003', description: 'Wide-leg parachute silhouette, lightweight nylon shell, elastic waistband.', pricePerUnit: 24, tierPricing: [{ minQty: 30, pricePerUnit: 20 }, { minQty: 100, pricePerUnit: 17 }], stockLevel: 12, warehouseLocation: 'Bin B-03, Warehouse 1', images: ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&h=750&fit=crop&auto=format'] },

  // Tees
  { name: 'Essential Heavyweight Tee', category: 'Tees', sku: 'TEE-001', description: '280gsm 100% ring-spun cotton, crew neck, boxy fit.', pricePerUnit: 8, tierPricing: [{ minQty: 100, pricePerUnit: 6.5 }, { minQty: 500, pricePerUnit: 5.5 }], stockLevel: 620, warehouseLocation: 'Bin C-01, Warehouse 2', images: ['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=750&fit=crop&auto=format'] },
  { name: 'Longline Graphic Tee', category: 'Tees', sku: 'TEE-002', description: 'Extended hem longline cut, front graphic panel, preshrunk cotton.', pricePerUnit: 9, tierPricing: [{ minQty: 100, pricePerUnit: 7.5 }, { minQty: 500, pricePerUnit: 6 }], stockLevel: 440, warehouseLocation: 'Bin C-02, Warehouse 2', images: ['https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&h=750&fit=crop&auto=format'] },
  { name: 'Pocket Tee Slim Fit', category: 'Tees', sku: 'TEE-003', description: 'Slim-fit with single chest pocket, 240gsm jersey, reinforced collar.', pricePerUnit: 7.5, tierPricing: [{ minQty: 100, pricePerUnit: 6 }, { minQty: 500, pricePerUnit: 5 }], stockLevel: 310, warehouseLocation: 'Bin C-03, Warehouse 2', images: ['https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=750&fit=crop&auto=format'] },

  // Jackets
  { name: 'Coach Jacket Satin', category: 'Jackets', sku: 'JKT-001', description: 'Lightweight satin coach jacket, embroidered back panel, snap-button placket.', pricePerUnit: 32, tierPricing: [{ minQty: 20, pricePerUnit: 28 }, { minQty: 75, pricePerUnit: 24 }], stockLevel: 85, warehouseLocation: 'Bin D-01, Warehouse 2', images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=750&fit=crop&auto=format'] },
  { name: 'Puffer Quilted Jacket', category: 'Jackets', sku: 'JKT-002', description: 'Channel-quilted puffer, recycled polyester fill, stand collar, YKK zips.', pricePerUnit: 38, tierPricing: [{ minQty: 20, pricePerUnit: 33 }, { minQty: 75, pricePerUnit: 28 }], stockLevel: 56, warehouseLocation: 'Bin D-02, Warehouse 2', images: ['https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=600&h=750&fit=crop&auto=format'] },
  { name: 'Bomber Varsity Jacket', category: 'Jackets', sku: 'JKT-003', description: 'Classic varsity bomber, wool-blend body, leather-look sleeve panels, rib trim.', pricePerUnit: 42, tierPricing: [{ minQty: 20, pricePerUnit: 36 }, { minQty: 75, pricePerUnit: 31 }], stockLevel: 7, warehouseLocation: 'Bin D-03, Warehouse 2', images: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=750&fit=crop&auto=format'] },

  // Shorts
  { name: 'Mesh Athletic Shorts', category: 'Shorts', sku: 'SHT-001', description: '100% polyester mesh, elasticated drawstring waist, inner brief liner.', pricePerUnit: 10, tierPricing: [{ minQty: 50, pricePerUnit: 8.5 }, { minQty: 200, pricePerUnit: 7 }], stockLevel: 270, warehouseLocation: 'Bin E-01, Warehouse 3', images: ['https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=600&h=750&fit=crop&auto=format'] },
  { name: 'Cargo Utility Shorts', category: 'Shorts', sku: 'SHT-002', description: 'Multi-pocket cargo shorts, cotton twill, zip fly, reinforced belt loops.', pricePerUnit: 14, tierPricing: [{ minQty: 50, pricePerUnit: 12 }, { minQty: 200, pricePerUnit: 10 }], stockLevel: 145, warehouseLocation: 'Bin E-02, Warehouse 3', images: ['https://images.unsplash.com/photo-1562183241-b937e95585b6?w=600&h=750&fit=crop&auto=format'] },

  // Accessories
  { name: 'Structured Snapback Cap', category: 'Accessories', sku: 'ACC-001', description: 'Six-panel structured cap, embroidered front logo, flat brim, snapback closure.', pricePerUnit: 7, tierPricing: [{ minQty: 50, pricePerUnit: 5.5 }, { minQty: 200, pricePerUnit: 4.5 }], stockLevel: 380, warehouseLocation: 'Bin F-01, Warehouse 3', images: ['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=750&fit=crop&auto=format'] },
  { name: 'Ribbed Beanie Hat', category: 'Accessories', sku: 'ACC-002', description: 'Fine-knit ribbed beanie, 100% acrylic, turn-up brim, embroidered flag detail.', pricePerUnit: 5.5, tierPricing: [{ minQty: 50, pricePerUnit: 4.5 }, { minQty: 200, pricePerUnit: 3.5 }], stockLevel: 19, warehouseLocation: 'Bin F-02, Warehouse 3', images: ['https://images.unsplash.com/photo-1510598155651-00e18c84d31e?w=600&h=750&fit=crop&auto=format'] },
  { name: 'Tactical Crossbody Bag', category: 'Accessories', sku: 'ACC-003', description: '600D nylon, multiple zip compartments, molle webbing, padded shoulder strap.', pricePerUnit: 18, tierPricing: [{ minQty: 20, pricePerUnit: 15 }, { minQty: 100, pricePerUnit: 12 }], stockLevel: 62, warehouseLocation: 'Bin F-03, Warehouse 3', images: ['https://images.unsplash.com/photo-1547949003-9792a18a2601?w=600&h=750&fit=crop&auto=format'] },
  { name: 'Logo Embroidered Socks 3-Pack', category: 'Accessories', sku: 'ACC-004', description: 'Three-pair pack, cushioned sole, arch support, ribbed ankle band.', pricePerUnit: 4, tierPricing: [{ minQty: 100, pricePerUnit: 3.2 }, { minQty: 500, pricePerUnit: 2.6 }], stockLevel: 540, warehouseLocation: 'Bin F-04, Warehouse 3', images: ['https://images.unsplash.com/photo-1554284126-aa88f22d8b74?w=600&h=750&fit=crop&auto=format'] },
];

// ─── Seeding Logic ────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Only seed if collections are empty
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) {
    console.log('Database already seeded — skipping.');
    await mongoose.disconnect();
    return;
  }

  console.log('Seeding users...');
  const createdUsers = [];
  for (const u of USERS) {
    const user = await User.create({
      name: u.name,
      email: u.email,
      passwordHash: u.password, // pre-save hook hashes it
      role: u.role,
      companyName: u.companyName,
      phone: u.phone,
    });
    createdUsers.push(user);
  }

  console.log('Seeding products...');
  const createdProducts = await Product.insertMany(PRODUCTS);

  console.log('Seeding orders...');
  const clients = createdUsers.filter((u) => u.role === 'client');

  const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  const PAYMENT_STATUSES = ['Unpaid', 'Paid', 'Simulated'];

  for (let i = 0; i < 15; i++) {
    const client = clients[i % clients.length];
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const product = createdProducts[Math.floor(Math.random() * createdProducts.length)];
      const quantity = (Math.floor(Math.random() * 4) + 1) * 25; // 25,50,75,100
      // Find matching tier price
      const tiers = [...(product.tierPricing || [])].sort((a, b) => b.minQty - a.minQty);
      const tier = tiers.find((t) => quantity >= t.minQty);
      const unitPrice = tier ? tier.pricePerUnit : product.pricePerUnit;
      subtotal += unitPrice * quantity;
      items.push({ product: product._id, quantity, unitPrice });
    }

    const status = ORDER_STATUSES[i % ORDER_STATUSES.length];
    const paymentStatus = PAYMENT_STATUSES[Math.floor(Math.random() * 3)];

    // Create with a date offset so orders span time
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(Date.now() - daysAgo * 86400000);

    const order = new Order({
      client: client._id,
      items,
      subtotal,
      totalAmount: subtotal,
      status,
      paymentStatus,
      notes: i % 3 === 0 ? 'Please dispatch before end of month.' : undefined,
    });
    order.createdAt = createdAt;
    await order.save();
  }

  console.log('Seeding metrics...');
  const now = Date.now();
  const metricDocs = [];
  for (let i = 29; i >= 0; i--) {
    const snap = generateSnapshot();
    snap.timestamp = new Date(now - i * (24 * 60 * 60 * 1000) / 30); // spread over 24h
    metricDocs.push(snap);
  }
  await Metric.insertMany(metricDocs);

  console.log('Seed complete.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
