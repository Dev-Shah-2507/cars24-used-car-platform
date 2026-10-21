/*
 * Resets the database to a clean demo state:
 *   - 4 demo users (one per role) + 1 internal stock-owner account (not for login)
 *   - 5 sample cars already "Available for Sale" (with inspection reports) so the marketplace is not empty.
 * The live demo workflow (seller -> evaluator -> admin -> buyer) then starts from a brand-new submission.
 * Safe to run repeatedly:  npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Inspection = require('../models/Inspection');

const DEMO_USERS = [
  { name: 'Demo Seller', email: 'seller@demo.com', password: 'Seller@123', role: 'seller' },
  { name: 'Demo Evaluator', email: 'evaluator@demo.com', password: 'Evaluator@123', role: 'evaluator' },
  { name: 'Demo Admin', email: 'admin@demo.com', password: 'Admin@123', role: 'admin' },
  { name: 'Demo Buyer', email: 'buyer@demo.com', password: 'Buyer@123', role: 'buyer' },
];

const thisYear = new Date().getFullYear();
const SAMPLE_CARS = [
  { make: 'Maruti Suzuki', model: 'Swift VXi', offer: 450000, age: 3, mileage: 28000, fuelType: 'Petrol', transmission: 'Manual', ratings: { exterior: 8, interior: 8, mechanical: 9 }, notes: 'Single owner, service history complete. Minor scratch on rear bumper.' },
  { make: 'Hyundai', model: 'Creta SX', offer: 780000, age: 4, mileage: 46000, fuelType: 'Diesel', transmission: 'Automatic', ratings: { exterior: 7, interior: 8, mechanical: 8 }, notes: 'Well maintained. New tyres fitted. Light wear on driver seat.' },
  { make: 'Honda', model: 'City ZX', offer: 520000, age: 5, mileage: 61000, fuelType: 'Petrol', transmission: 'Manual', ratings: { exterior: 7, interior: 7, mechanical: 8 }, notes: 'Smooth engine, AC cooling good. Paint touch-ups on left door.' },
  { make: 'Tata', model: 'Nexon XZ+', offer: 690000, age: 2, mileage: 19000, fuelType: 'Petrol', transmission: 'Manual', ratings: { exterior: 9, interior: 9, mechanical: 9 }, notes: 'Almost like new. No accidents recorded.' },
  { make: 'Toyota', model: 'Innova Crysta', offer: 1150000, age: 6, mileage: 88000, fuelType: 'Diesel', transmission: 'Manual', ratings: { exterior: 6, interior: 7, mechanical: 8 }, notes: 'Heavy usage but mechanically strong. Suspension recently serviced.' },
];

async function seed() {
  await connectDB();

  await Promise.all([User.deleteMany({}), Vehicle.deleteMany({}), Inspection.deleteMany({})]);

  const users = {};
  for (const u of DEMO_USERS) {
    users[u.role] = await User.create({
      name: u.name,
      email: u.email,
      role: u.role,
      passwordHash: await User.hashPassword(u.password),
    });
  }

  // Sample stock belongs to a separate account (nobody logs in as it), so the demo seller starts with an empty dashboard.
  const stockOwner = await User.create({
    name: 'AutoHub Stock',
    email: 'stock@demo.com',
    role: 'seller',
    passwordHash: await User.hashPassword(require('crypto').randomBytes(16).toString('hex')),
  });

  for (const c of SAMPLE_CARS) {
    const base = {
      seller: stockOwner._id,
      make: c.make,
      model: c.model,
      year: thisYear - c.age,
      mileage: c.mileage,
      fuelType: c.fuelType,
      transmission: c.transmission,
      condition: { exterior: 'good', interior: 'good', mechanical: 'good' },
    };
    const finalOffer = c.offer;
    const vehicle = await Vehicle.create({
      ...base,
      finalOffer,
      status: 'Available for Sale',
      refurbishmentStatus: 'Completed',
      sellingPrice: Math.round((finalOffer * 1.2) / 1000) * 1000,
    });
    await Inspection.create({
      vehicle: vehicle._id,
      evaluator: users.evaluator._id,
      appointmentDate: new Date(),
      ratings: c.ratings,
      notes: c.notes,
      status: 'Completed',
      completedAt: new Date(),
    });
  }

  console.log(`Seeded ${DEMO_USERS.length} users and ${SAMPLE_CARS.length} sample vehicles.`);
  DEMO_USERS.forEach((u) => console.log(`  ${u.role.padEnd(10)} ${u.email}  /  ${u.password}`));
}

seed()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error('Seeding failed:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  });
