/*
 * Seller workflow test (Phase 2). Needs a running MongoDB.
 * Uses a SEPARATE database (car_marketplace_test) so your demo data is never touched.
 * Override with MONGO_URI_TEST if needed.   Run:  npm test
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
  make: 'Hyundai', model: 'i20', year: new Date().getFullYear() - 3, mileage: 30000,
  fuelType: 'Petrol', transmission: 'Manual',
  condition: { exterior: 'good', interior: 'good', mechanical: 'excellent' },
};
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

let sellerToken, otherSellerToken, evaluatorToken;

async function makeUser(email, role, password) {
  await User.create({ name: role, email, role, passwordHash: await User.hashPassword(password) });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await Promise.all([User.deleteMany({}), Vehicle.deleteMany({}), Inspection.deleteMany({})]);
  sellerToken = await makeUser('s1@test.com', 'seller', 'Pass@123');
  otherSellerToken = await makeUser('s2@test.com', 'seller', 'Pass@123');
  evaluatorToken = await makeUser('e1@test.com', 'evaluator', 'Pass@123');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const auth = (t) => ({ Authorization: `Bearer ${t}` });

describe('auth and roles', () => {
  test('wrong password is rejected', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 's1@test.com', password: 'nope' });
    expect(res.status).toBe(401);
  });
  test('evaluator cannot use seller endpoints (403)', async () => {
    const res = await request(app).get('/api/seller/vehicles').set(auth(evaluatorToken));
    expect(res.status).toBe(403);
  });
  test('no token gives 401', async () => {
    expect((await request(app).get('/api/seller/vehicles')).status).toBe(401);
  });
});

describe('seller submission and inspection booking', () => {
  let id;

  test('invalid vehicle is rejected', async () => {
    const res = await request(app).post('/api/seller/vehicles').set(auth(sellerToken)).send({ ...car, year: 1800 });
    expect(res.status).toBe(400);
  });

  test('valid vehicle is stored as Submitted with no price at all', async () => {
    const res = await request(app).post('/api/seller/vehicles').set(auth(sellerToken))
      .send({ ...car, status: 'Sold', finalOffer: 999, estimatedQuote: 5 }); // client-sent values must be ignored
    expect(res.status).toBe(201);
    expect(res.body.vehicle.status).toBe('Submitted');
    expect(res.body.vehicle.finalOffer).toBeNull();
    expect(res.body.vehicle.estimatedQuote).toBeUndefined(); // there is no estimate
    id = res.body.vehicle._id;
  });

  test('seller sees own vehicle; another seller gets 404', async () => {
    expect((await request(app).get('/api/seller/vehicles').set(auth(sellerToken))).body.vehicles).toHaveLength(1);
    expect((await request(app).get('/api/seller/vehicles').set(auth(otherSellerToken))).body.vehicles).toHaveLength(0);
    expect((await request(app).get(`/api/seller/vehicles/${id}`).set(auth(otherSellerToken))).status).toBe(404);
  });

  test('past inspection date is rejected', async () => {
    const res = await request(app).post(`/api/seller/vehicles/${id}/book-inspection`).set(auth(sellerToken))
      .send({ appointmentDate: '2020-01-01' });
    expect(res.status).toBe(400);
  });

  test('another seller cannot book inspection for this vehicle', async () => {
    const res = await request(app).post(`/api/seller/vehicles/${id}/book-inspection`).set(auth(otherSellerToken))
      .send({ appointmentDate: tomorrow() });
    expect(res.status).toBe(404);
  });

  test('booking creates a Scheduled inspection and moves status to Inspection Pending', async () => {
    const res = await request(app).post(`/api/seller/vehicles/${id}/book-inspection`).set(auth(sellerToken))
      .send({ appointmentDate: tomorrow() });
    expect(res.status).toBe(201);
    expect(res.body.vehicle.status).toBe('Inspection Pending');
    expect(res.body.inspection.status).toBe('Scheduled');
    const details = await request(app).get(`/api/seller/vehicles/${id}`).set(auth(sellerToken));
    expect(details.body.vehicle.status).toBe('Inspection Pending');
    expect(details.body.inspection).not.toBeNull();
  });

  test('booking twice is rejected (invalid transition)', async () => {
    const res = await request(app).post(`/api/seller/vehicles/${id}/book-inspection`).set(auth(sellerToken))
      .send({ appointmentDate: tomorrow() });
    expect(res.status).toBe(400);
  });
});
