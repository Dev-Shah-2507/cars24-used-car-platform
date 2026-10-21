/*
 * Phase 4 test: accepted vehicle -> admin inventory -> buyer marketplace.
 * Needs a running MongoDB. Uses a SEPARATE database (car_marketplace_test).   Run: npm test
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Inspection = require('../models/Inspection');

const TEST_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/car_marketplace_test';
const car = {
  make: 'Skoda', model: 'Rapid', year: new Date().getFullYear() - 3, mileage: 40000,
  fuelType: 'Diesel', transmission: 'Manual',
  condition: { exterior: 'good', interior: 'good', mechanical: 'good' },
};
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const auth = (t) => ({ Authorization: `Bearer ${t}` });
let seller, evaluator, admin, buyer;

async function makeUser(email, role) {
  await User.create({ name: role, email, role, passwordHash: await User.hashPassword('Pass@123') });
  return (await request(app).post('/api/auth/login').send({ email, password: 'Pass@123' })).body.token;
}
const setStatus = (id, body) => request(app).patch(`/api/admin/vehicles/${id}/status`).set(auth(admin)).send(body);

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await Promise.all([User.deleteMany({}), Vehicle.deleteMany({}), Inspection.deleteMany({})]);
  seller = await makeUser('s@test.com', 'seller');
  evaluator = await makeUser('e@test.com', 'evaluator');
  admin = await makeUser('a@test.com', 'admin');
  buyer = await makeUser('b@test.com', 'buyer');
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('inventory and marketplace', () => {
  let id;

  test('role guards on admin and buyer endpoints', async () => {
    expect((await request(app).get('/api/admin/vehicles').set(auth(seller))).status).toBe(403);
    expect((await request(app).get('/api/admin/stats').set(auth(buyer))).status).toBe(403);
    expect((await request(app).get('/api/buyer/vehicles').set(auth(admin))).status).toBe(403);
    expect((await request(app).get('/api/buyer/vehicles')).status).toBe(401);
  });

  test('set up an accepted vehicle through the real workflow', async () => {
    const v = (await request(app).post('/api/seller/vehicles').set(auth(seller)).send(car)).body.vehicle;
    id = v._id;
    const b = await request(app).post(`/api/seller/vehicles/${id}/book-inspection`).set(auth(seller)).send({ appointmentDate: tomorrow() });
    await request(app).post(`/api/evaluator/inspections/${b.body.inspection._id}/submit`).set(auth(evaluator))
      .send({ ratings: { exterior: 8, interior: 8, mechanical: 8 }, notes: 'Solid car.', offerPrice: 520000 });
    const acc = await request(app).post(`/api/seller/vehicles/${id}/respond-offer`).set(auth(seller)).send({ decision: 'accept' });
    expect(acc.body.vehicle.status).toBe('Offer Accepted');
    expect(acc.body.vehicle.finalOffer).toBe(520000);
  });

  test('admin sees the vehicle and counts', async () => {
    const list = await request(app).get('/api/admin/vehicles').set(auth(admin));
    expect(list.body.vehicles.find((v) => v._id === id).inspection.status).toBe('Completed');
    const stats = await request(app).get('/api/admin/stats').set(auth(admin));
    expect(stats.body.counts['Offer Accepted']).toBe(1);
    expect(stats.body.total).toBe(1);
  });

  test('buyer cannot see it yet', async () => {
    const res = await request(app).get('/api/buyer/vehicles').set(auth(buyer));
    expect(res.body.vehicles).toHaveLength(0);
    expect((await request(app).get(`/api/buyer/vehicles/${id}`).set(auth(buyer))).status).toBe(404);
  });

  test('invalid transitions are rejected', async () => {
    expect((await setStatus(id, { status: 'Available for Sale', sellingPrice: 500000 })).status).toBe(400); // skips steps
    expect((await setStatus(id, { status: 'Sold' })).status).toBe(400);
    expect((await setStatus(id, { status: 'Offer Rejected' })).status).toBe(400); // not an admin status
    expect((await setStatus(id, { status: 'Nonsense' })).status).toBe(400);
  });

  test('purchase -> refurbishment starts In Progress', async () => {
    expect((await setStatus(id, { status: 'Purchased' })).body.vehicle.status).toBe('Purchased');
    const r = await setStatus(id, { status: 'Under Refurbishment' });
    expect(r.body.vehicle.refurbishmentStatus).toBe('In Progress');
  });

  test('cannot list before refurbishment is Completed, or without a price', async () => {
    expect((await setStatus(id, { status: 'Available for Sale', sellingPrice: 500000 })).status).toBe(400);
    const bad = await request(app).patch(`/api/admin/vehicles/${id}/refurbishment`).set(auth(admin)).send({ refurbishmentStatus: 'Done' });
    expect(bad.status).toBe(400);
    const ok = await request(app).patch(`/api/admin/vehicles/${id}/refurbishment`).set(auth(admin)).send({ refurbishmentStatus: 'Completed' });
    expect(ok.body.vehicle.refurbishmentStatus).toBe('Completed');
    expect((await setStatus(id, { status: 'Available for Sale' })).status).toBe(400); // no price
    expect((await setStatus(id, { status: 'Available for Sale', sellingPrice: -5 })).status).toBe(400);
  });

  test('listing makes it visible to the buyer, without internal fields', async () => {
    const r = await setStatus(id, { status: 'Available for Sale', sellingPrice: 650000 });
    expect(r.body.vehicle.status).toBe('Available for Sale');
    const list = await request(app).get('/api/buyer/vehicles').set(auth(buyer));
    expect(list.body.vehicles).toHaveLength(1);
    expect(list.body.vehicles[0].finalOffer).toBeUndefined();
    expect(list.body.vehicles[0].seller).toBeUndefined();
    const d = await request(app).get(`/api/buyer/vehicles/${id}`).set(auth(buyer));
    expect(d.body.vehicle.sellingPrice).toBe(650000);
    expect(d.body.inspection.ratings.mechanical).toBe(8);
  });

  test('search and filters', async () => {
    const q = (qs) => request(app).get(`/api/buyer/vehicles?${qs}`).set(auth(buyer)).then((r) => r.body.vehicles.length);
    expect(await q('search=skoda')).toBe(1);
    expect(await q('search=skoda rapid')).toBe(1);
    expect(await q('search=honda')).toBe(0);
    expect(await q('minPrice=700000')).toBe(0);
    expect(await q('maxPrice=700000&minPrice=600000')).toBe(1);
    expect(await q(`minYear=${new Date().getFullYear()}`)).toBe(0);
    expect(await q('search=.*')).toBe(0); // regex characters are escaped
  });

  test('sold vehicles disappear from the marketplace', async () => {
    expect((await setStatus(id, { status: 'Sold' })).body.vehicle.status).toBe('Sold');
    expect((await request(app).get('/api/buyer/vehicles').set(auth(buyer))).body.vehicles).toHaveLength(0);
    expect((await request(app).get(`/api/buyer/vehicles/${id}`).set(auth(buyer))).status).toBe(404);
    expect((await setStatus(id, { status: 'Purchased' })).status).toBe(400); // terminal
  });
});
