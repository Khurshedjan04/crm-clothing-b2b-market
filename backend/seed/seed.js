require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User         = require('../models/User');
const Customer     = require('../models/Customer');
const Lead         = require('../models/Lead');
const Opportunity  = require('../models/Opportunity');
const Activity     = require('../models/Activity');
const InventoryItem= require('../models/InventoryItem');
const AuditLog     = require('../models/AuditLog');

const daysAgo = n => new Date(Date.now() - n * 86400000);
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected — dropping existing data...');
  await Promise.all([
    User.deleteMany({}), Customer.deleteMany({}), Lead.deleteMany({}),
    Opportunity.deleteMany({}), Activity.deleteMany({}),
    InventoryItem.deleteMany({}), AuditLog.deleteMany({})
  ]);

  // ── Users ──────────────────────────────────────────────
  // Use User.create() — triggers pre-save hook exactly once so passwords hash correctly
  console.log('Seeding users...');
  const users = await Promise.all([
    User.create({ name: 'Alex Morgan',  email: 'manager@crm.test', passwordHash: 'Manager123!', role: 'manager' }),
    User.create({ name: 'Sarah Chen',   email: 'admin@crm.test',   passwordHash: 'Admin123!',   role: 'admin'   }),
    User.create({ name: 'James Wilson', email: 'james@crm.test',   passwordHash: 'Admin123!',   role: 'admin'   }),
    User.create({ name: 'Priya Kapoor', email: 'priya@crm.test',   passwordHash: 'Admin123!',   role: 'admin'   }),
  ]);

  const [manager, admin1, admin2, admin3] = users;
  const admins = [admin1, admin2, admin3];

  // ── Customers ──────────────────────────────────────────
  console.log('Seeding customers...');
  const customerData = [
    { name: 'Emma Thompson',  company: 'Vertex Solutions',    email: 'emma@vertex.io',      phone: '+1 555-0101', status: 'active',   industry: 'Technology',   address: 'San Francisco, CA' },
    { name: 'Liam Nguyen',    company: 'BlueSky Retail',      email: 'liam@bluesky.com',    phone: '+1 555-0102', status: 'active',   industry: 'Retail',       address: 'Austin, TX' },
    { name: 'Olivia Martinez',company: 'CloudNine Media',     email: 'olivia@c9media.com',  phone: '+1 555-0103', status: 'active',   industry: 'Media',        address: 'New York, NY' },
    { name: 'Noah Williams',  company: 'Pinnacle Finance',    email: 'noah@pinnacle.com',   phone: '+1 555-0104', status: 'inactive', industry: 'Finance',      address: 'Chicago, IL' },
    { name: 'Ava Johnson',    company: 'GreenLeaf Logistics', email: 'ava@greenleaf.com',   phone: '+1 555-0105', status: 'active',   industry: 'Logistics',    address: 'Seattle, WA' },
    { name: 'William Brown',  company: 'StoneWall Constructions', email: 'will@stonewall.com', phone: '+1 555-0106', status: 'prospect', industry: 'Construction', address: 'Denver, CO' },
    { name: 'Sophia Davis',   company: 'BrightMind Education',email: 'sophia@brightmind.edu',phone: '+1 555-0107', status: 'active',  industry: 'Education',    address: 'Boston, MA' },
    { name: 'James Miller',   company: 'IronCast Manufacturing', email: 'james@ironcast.com', phone: '+1 555-0108', status: 'active', industry: 'Manufacturing', address: 'Detroit, MI' },
    { name: 'Isabella Wilson','company': 'NovaMed Healthcare', email: 'bella@novamed.com',  phone: '+1 555-0109', status: 'prospect', industry: 'Healthcare',   address: 'Houston, TX' },
    { name: 'Mason Moore',    company: 'SkyHigh Airlines',    email: 'mason@skyhigh.com',   phone: '+1 555-0110', status: 'active',   industry: 'Aviation',     address: 'Miami, FL' },
    { name: 'Charlotte Taylor',company: 'PureFood Organics',  email: 'charlie@purefood.com',phone: '+1 555-0111', status: 'inactive', industry: 'Food & Bev',   address: 'Portland, OR' },
    { name: 'Ethan Anderson', company: 'CodeForge Labs',      email: 'ethan@codeforge.io',  phone: '+1 555-0112', status: 'active',   industry: 'Technology',   address: 'Austin, TX' },
    { name: 'Amelia Thomas',  company: 'Silver Lining PR',    email: 'amelia@silverlining.com', phone: '+1 555-0113', status: 'active', industry: 'Marketing',  address: 'Los Angeles, CA' },
    { name: 'Alexander Jackson', company: 'DeepSea Ventures', email: 'alex@deepsea.com',   phone: '+1 555-0114', status: 'prospect', industry: 'Venture Capital', address: 'New York, NY' },
    { name: 'Harper White',   company: 'WoodCraft Furniture', email: 'harper@woodcraft.com',phone: '+1 555-0115', status: 'active',   industry: 'Furniture',    address: 'Nashville, TN' },
    { name: 'Benjamin Harris',company: 'AtlasRoute Shipping', email: 'ben@atlasroute.com',  phone: '+1 555-0116', status: 'active',   industry: 'Shipping',     address: 'Long Beach, CA' },
    { name: 'Evelyn Martin',  company: 'ClearPath Legal',     email: 'evelyn@clearpath.com',phone: '+1 555-0117', status: 'prospect', industry: 'Legal',        address: 'Washington, DC' },
    { name: 'Sebastian Garcia','company': 'TopLine Sports',   email: 'seb@topline.com',    phone: '+1 555-0118', status: 'active',   industry: 'Sports',       address: 'Phoenix, AZ' },
    { name: 'Mia Martinez',   company: 'EcoHomes Realty',     email: 'mia@ecohomes.com',    phone: '+1 555-0119', status: 'inactive', industry: 'Real Estate',  address: 'San Diego, CA' },
    { name: 'Daniel Robinson',company: 'BoldPrint Studios',   email: 'daniel@boldprint.com',phone: '+1 555-0120', status: 'active',   industry: 'Design',       address: 'Brooklyn, NY' },
    { name: 'Aria Clark',     company: 'QuantumData Systems', email: 'aria@quantumdata.com',phone: '+1 555-0121', status: 'active',   industry: 'Technology',   address: 'San Jose, CA' },
    { name: 'Henry Lewis',    company: 'MaplePeak Hotels',    email: 'henry@maplepeak.com', phone: '+1 555-0122', status: 'prospect', industry: 'Hospitality',  address: 'Orlando, FL' },
    { name: 'Grace Lee',      company: 'RedRock Energy',      email: 'grace@redroc.com',    phone: '+1 555-0123', status: 'active',   industry: 'Energy',       address: 'Dallas, TX' },
    { name: 'Jackson Walker', company: 'FrostLine Cold Chain',email: 'jw@frostline.com',    phone: '+1 555-0124', status: 'active',   industry: 'Logistics',    address: 'Minneapolis, MN' },
    { name: 'Scarlett Hall',  company: 'PearlPoint Jewellers',email: 'scarlett@pearlpoint.com', phone: '+1 555-0125', status: 'active', industry: 'Retail',   address: 'Atlanta, GA' },
  ];

  const customers = [];
  for (let i = 0; i < customerData.length; i++) {
    const c = await Customer.create({
      ...customerData[i],
      assignedTo: admins[i % admins.length]._id,
      createdBy: rand(admins)._id,
      createdAt: daysAgo(randNum(5, 365)),
    });
    customers.push(c);
  }

  // ── Leads ──────────────────────────────────────────────
  console.log('Seeding leads...');
  const sources = ['website','referral','social','email','cold-call','other'];
  const statuses = ['new','contacted','qualified','lost'];
  const leadNames = [
    'Oliver Scott','Emily Turner','Lucas Adams','Chloe Baker','Ryan Mitchell',
    'Hannah Carter','Dylan Morris','Zoe Phillips','Nathan Evans','Lily Roberts',
    'Austin Parker','Sofia Barnes','Tyler Ross','Maya Hughes','Brandon Jenkins',
    'Stella Price','Cameron Bennett','Ruby Butler','Jordan Coleman','Isla Foster',
    'Hunter Griffin','Aubrey Simmons','Landon Patterson','Nora Sanders','Brody Russell',
    'Penelope Griffin','Cole Hayes','Violet Collins','Eli Richardson','Naomi Flores',
    'Carson Reed','Layla Cox','Blake Brooks','Avery Diaz','Sawyer Stewart',
  ];

  const leads = [];
  for (let i = 0; i < leadNames.length; i++) {
    const status = statuses[i % statuses.length];
    const l = await Lead.create({
      name: leadNames[i],
      email: `${leadNames[i].toLowerCase().replace(' ', '.')}@example.com`,
      phone: `+1 555-${String(200 + i).padStart(4,'0')}`,
      company: `${leadNames[i].split(' ')[1]} Enterprises`,
      source: sources[i % sources.length],
      status,
      value: randNum(500, 75000),
      owner: admins[i % admins.length]._id,
      notes: 'Initial contact made. Awaiting follow-up.',
      createdAt: daysAgo(randNum(1, 180)),
    });
    leads.push(l);
  }

  // ── Opportunities ──────────────────────────────────────
  console.log('Seeding opportunities...');
  const stages = ['prospecting','proposal','negotiation','won','lost'];
  const oppTitles = [
    'Enterprise License Deal','Cloud Migration Contract','Annual Support Package',
    'Digital Transformation Project','Managed Services Agreement','Custom Integration Work',
    'Staff Training Programme','Data Analytics Platform','Security Audit & Compliance',
    'ERP Implementation','CRM Rollout','E-Commerce Platform Build',
    'Mobile App Development','Infrastructure Upgrade','API Integration Services',
    'Brand Refresh Campaign','SEO & Content Strategy','Marketing Automation Setup',
    'Logistics Optimisation','Warehouse Management System','Supply Chain Consulting',
    'Financial Planning Tool','Insurance Portal','Legal Document Management',
  ];

  const probabilities = { prospecting: 20, proposal: 45, negotiation: 70, won: 100, lost: 0 };
  for (let i = 0; i < oppTitles.length; i++) {
    const stage = stages[i % stages.length];
    await Opportunity.create({
      title: oppTitles[i],
      customer: customers[i % customers.length]._id,
      stage,
      amount: randNum(5000, 120000),
      owner: admins[i % admins.length]._id,
      probability: probabilities[stage],
      closeDate: new Date(Date.now() + randNum(7, 90) * 86400000),
      notes: 'Progressing well. Decision expected soon.',
      createdAt: daysAgo(randNum(1, 120)),
    });
  }

  // ── Activities ─────────────────────────────────────────
  console.log('Seeding activities...');
  const actTypes = ['call','email','meeting','task'];
  const actNotes = [
    'Followed up on proposal — client asked for pricing revision.',
    'Introductory call completed. Interest confirmed.',
    'Quarterly business review meeting scheduled.',
    'Sent product demo video and follow-up email.',
    'Contract review meeting — legal team involved.',
    'Cold call — went to voicemail, left message.',
    'Checked in after trial period. Positive feedback.',
    'Onboarding session completed successfully.',
    'Support escalation resolved. Customer satisfied.',
    'Renewal discussion — 3-year deal proposed.',
    'Sent updated proposal with revised pricing.',
    'Internal debrief after discovery call.',
    'Demo completed — requested custom pricing.',
    'Follow-up task: send case studies by Friday.',
    'Missed meeting — rescheduled for next week.',
    'Budget approval confirmed — moving to negotiation.',
    'Reference check completed with existing client.',
    'Sent contract draft for legal review.',
    'Kick-off call for new implementation project.',
    'Monthly check-in call — all metrics on target.',
    'Proposal walkthrough with decision-makers.',
    'Discovery call — identified 3 key pain points.',
    'Sent invoice for Phase 1 deliverables.',
    'Technical requirements gathering session.',
    'Executive sponsor meeting arranged.',
    'Partnership agreement discussion.',
    'Product roadmap presentation delivered.',
    'Support ticket reviewed and escalated.',
    'Invoice payment chased — 30 days overdue.',
    'New contact added to account after restructure.',
  ];

  for (let i = 0; i < 30; i++) {
    await Activity.create({
      type: actTypes[i % actTypes.length],
      note: actNotes[i % actNotes.length],
      relatedTo: customers[i % customers.length]._id,
      relatedModel: 'Customer',
      dueDate: i < 15 ? daysAgo(-randNum(1, 14)) : daysAgo(randNum(1, 30)),
      completed: i > 15,
      owner: admins[i % admins.length]._id,
      createdAt: daysAgo(randNum(0, 60)),
    });
  }

  // ── Inventory ──────────────────────────────────────────
  console.log('Seeding inventory...');
  await InventoryItem.insertMany([
    { sku: 'HOD-001', productName: 'Classic Pullover Hoodie',      category: 'Hoodies',      quantity: 340, price: 14.00, lowStockThreshold: 30, supplier: 'TextilePro Ltd' },
    { sku: 'HOD-002', productName: 'Zip-Up Logo Hoodie',           category: 'Hoodies',      quantity: 215, price: 16.00, lowStockThreshold: 25, supplier: 'TextilePro Ltd' },
    { sku: 'HOD-003', productName: 'Oversized Drop-Shoulder Hoodie',category:'Hoodies',      quantity: 18,  price: 15.00, lowStockThreshold: 25, supplier: 'FabricWorks' },
    { sku: 'CGO-001', productName: 'Tactical Cargo Pants',         category: 'Cargo Pants',  quantity: 180, price: 22.00, lowStockThreshold: 20, supplier: 'DenimHouse' },
    { sku: 'CGO-002', productName: 'Slim-Fit Cargo Chino',         category: 'Cargo Pants',  quantity: 95,  price: 20.00, lowStockThreshold: 20, supplier: 'DenimHouse' },
    { sku: 'CGO-003', productName: 'Wide-Leg Parachute Cargo',     category: 'Cargo Pants',  quantity: 8,   price: 24.00, lowStockThreshold: 20, supplier: 'FabricWorks' },
    { sku: 'TEE-001', productName: 'Essential Heavyweight Tee',    category: 'Tees',         quantity: 620, price: 8.00,  lowStockThreshold: 50, supplier: 'BasicThread Co' },
    { sku: 'TEE-002', productName: 'Longline Graphic Tee',         category: 'Tees',         quantity: 440, price: 9.00,  lowStockThreshold: 50, supplier: 'BasicThread Co' },
    { sku: 'TEE-003', productName: 'Pocket Tee Slim Fit',          category: 'Tees',         quantity: 310, price: 7.50,  lowStockThreshold: 50, supplier: 'BasicThread Co' },
    { sku: 'JKT-001', productName: 'Coach Jacket Satin',           category: 'Jackets',      quantity: 85,  price: 32.00, lowStockThreshold: 15, supplier: 'OuterwearPlus' },
    { sku: 'JKT-002', productName: 'Puffer Quilted Jacket',        category: 'Jackets',      quantity: 56,  price: 38.00, lowStockThreshold: 15, supplier: 'OuterwearPlus' },
    { sku: 'JKT-003', productName: 'Bomber Varsity Jacket',        category: 'Jackets',      quantity: 7,   price: 42.00, lowStockThreshold: 15, supplier: 'OuterwearPlus' },
    { sku: 'SHT-001', productName: 'Mesh Athletic Shorts',         category: 'Shorts',       quantity: 270, price: 10.00, lowStockThreshold: 30, supplier: 'SportsTex' },
    { sku: 'SHT-002', productName: 'Cargo Utility Shorts',         category: 'Shorts',       quantity: 145, price: 14.00, lowStockThreshold: 30, supplier: 'SportsTex' },
    { sku: 'ACC-001', productName: 'Structured Snapback Cap',      category: 'Accessories',  quantity: 380, price: 7.00,  lowStockThreshold: 40, supplier: 'HeadGear Inc' },
    { sku: 'ACC-002', productName: 'Ribbed Beanie Hat',            category: 'Accessories',  quantity: 19,  price: 5.50,  lowStockThreshold: 40, supplier: 'HeadGear Inc' },
    { sku: 'ACC-003', productName: 'Tactical Crossbody Bag',       category: 'Accessories',  quantity: 62,  price: 18.00, lowStockThreshold: 10, supplier: 'BagMakers Co' },
    { sku: 'ACC-004', productName: 'Logo Embroidered Socks 3-Pack',category:'Accessories',   quantity: 540, price: 4.00,  lowStockThreshold: 60, supplier: 'BasicThread Co' },
    { sku: 'ACC-005', productName: 'Canvas Tote Bag',              category: 'Accessories',  quantity: 6,   price: 8.00,  lowStockThreshold: 20, supplier: 'BagMakers Co' },
    { sku: 'OUT-001', productName: 'Waterproof Shell Jacket',      category: 'Outerwear',    quantity: 44,  price: 55.00, lowStockThreshold: 10, supplier: 'OuterwearPlus' },
  ]);

  // ── Audit Logs ─────────────────────────────────────────
  console.log('Seeding audit logs...');
  const actions = ['LOGIN','CREATE','UPDATE','DELETE','EXPORT','VIEW'];
  const entities = ['Customer','Lead','Opportunity','User','InventoryItem','Activity'];
  for (let i = 0; i < 30; i++) {
    await AuditLog.create({
      user: rand(users)._id,
      userName: rand(users).name,
      action: actions[i % actions.length],
      entity: entities[i % entities.length],
      entityId: customers[i % customers.length]._id,
      details: { ip: `192.168.1.${randNum(1, 254)}` },
      timestamp: daysAgo(randNum(0, 30)),
    });
  }

  console.log('Seed complete ✓');
  await mongoose.disconnect();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
