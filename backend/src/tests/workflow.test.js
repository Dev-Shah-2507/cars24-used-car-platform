/*
 * Phase 3 end-to-end test: seller -> evaluator -> final offer -> seller decision.
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
  make: 'Honda', model: 'City', year: new Date().getFullYear() - 4, mileage: 52000,
  fuelType: 'Petrol', transmission: 'Manual',
  condition: { exterior: 'good', interior: 'fair', mechanical: 'good' },
};
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const auth = (t) => ({ Authorization: `Bearer ${t}` });
let seller, otherSeller, evaluator;

async function makeUser(email, role) {
  await User.create({ name: role, email, role, passwordHash: await User.hashPassword('Pass@123') });
  return (await request(app).post('/api/auth/login').send({ email, password: 'Pass@123' })).body.token;
}
async function submitAndBook() {
  const v = (await request(app).post('/api/seller/vehicles').set(auth(seller)).send(car)).body.vehicle;
  const b = await request(app).post(`/api/seller/vehicles/${v._id}/book-inspection`).set(auth(seller)).send({ appointmentDate: tomorrow() });
  return { vehicleId: v._id, inspectionId: b.body.inspection._id };
}

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await Promise.all([User.deleteMany({}), Vehicle.deleteMany({}), Inspection.deleteMany({})]);
  seller = await makeUser('s1@test.com', 'seller');
  otherSeller = await makeUser('s2@test.com', 'seller');
  evaluator = await makeUser('e1@test.com', 'evaluator');
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('evaluator access control', () => {
  test('seller cannot use evaluator endpoints (403)', async () => {
    expect((await request(app).get('/api/evaluator/inspections').set(auth(seller))).status).toBe(403);
  });
  test('evaluator cannot respond to an offer (403)', async () => {
    expect((await request(app).post('/api/seller/vehicles/x/respond-offer').set(auth(evaluator)).send({ decision: 'accept' })).status).toBe(403);
  });
});

describe('accept path', () => {
  let vehicleId, inspectionId;

  test('seller cannot respond before an offer exists', async () => {
    ({ vehicleId, inspectionId } = await submitAndBook());
    const res = await request(app).post(`/api/seller/vehicles/${vehicleId}/respond-offer`).set(auth(seller)).send({ decision: 'accept' });
    expect(res.status).toBe(400);
  });

  test('seller sees no price before the evaluator sets one', async () => {
    const d = await request(app).get(`/api/seller/vehicles/${vehicleId}`).set(auth(seller));
    expect(d.body.vehicle.finalOffer).toBeNull();
    expect(d.body.vehicle.estimatedQuote).toBeUndefined();
  });

  test('evaluator sees the inspection in the queue', async () => {
    const res = await request(app).get('/api/evaluator/inspections?status=Scheduled').set(auth(evaluator));
    expect(res.status).toBe(200);
    expect(res.body.inspections.find((i) => i._id === inspectionId)).toBeTruthy();
  });

  test('invalid ratings and missing notes are rejected', async () => {
    const bad = await request(app).post(`/api/evaluator/inspections/${inspectionId}/submit`).set(auth(evaluator))
      .send({ ratings: { exterior: 11, interior: 5, mechanical: 5 }, notes: 'x', offerPrice: 300000 });
    expect(bad.status).toBe(400);
    const noNotes = await request(app).post(`/api/evaluator/inspections/${inspectionId}/submit`).set(auth(evaluator))
      .send({ ratings: { exterior: 7, interior: 7, mechanical: 7 }, notes: '', offerPrice: 300000 });
    expect(noNotes.status).toBe(400);
  });

  test('offer price is required and must be a positive amount', async () => {
    const base = { ratings: { exterior: 7, interior: 7, mechanical: 7 }, notes: 'ok' };
    for (const offerPrice of [undefined, '', 0, -5000, 'abc', 999999999999]) {
      const res = await request(app).post(`/api/evaluator/inspections/${inspectionId}/submit`).set(auth(evaluator)).send({ ...base, offerPrice });
      expect(res.status).toBe(400);
    }
    // nothing was changed by the failed attempts
    const d = await request(app).get(`/api/seller/vehicles/${vehicleId}`).set(auth(seller));
    expect(d.body.vehicle.status).toBe('Inspection Pending');
    expect(d.body.vehicle.finalOffer).toBeNull();
  });

  test('report completes inspection and the evaluator\'s price becomes the final offer', async () => {
    const res = await request(app).post(`/api/evaluator/inspections/${inspectionId}/submit`).set(auth(evaluator))
      .send({ ratings: { exterior: 8, interior: 6, mechanical: 9 }, notes: 'Clean car, minor seat wear.', offerPrice: 385000 });
    expect(res.status).toBe(200);
    expect(res.body.inspection.status).toBe('Completed');
    expect(res.body.vehicle.status).toBe('Offer Generated');
    expect(res.body.vehicle.finalOffer).toBe(385000);
  });

  test('inspection cannot be submitted twice', async () => {
    const res = await request(app).post(`/api/evaluator/inspections/${inspectionId}/submit`).set(auth(evaluator))
      .send({ ratings: { exterior: 5, interior: 5, mechanical: 5 }, notes: 'again', offerPrice: 100000 });
    expect(res.status).toBe(400);
  });

  test('seller sees offer and report; other seller cannot respond', async () => {
    const d = await request(app).get(`/api/seller/vehicles/${vehicleId}`).set(auth(seller));
    expect(d.body.vehicle.status).toBe('Offer Generated');
    expect(d.body.vehicle.finalOffer).toBe(385000); // the second (rejected) submission did not overwrite it
    expect(d.body.inspection.status).toBe('Completed');
    const other = await request(app).post(`/api/seller/vehicles/${vehicleId}/respond-offer`).set(auth(otherSeller)).send({ decision: 'accept' });
    expect(other.status).toBe(404);
  });

  test('invalid decision is rejected, accept works once', async () => {
    const bad = await request(app).post(`/api/seller/vehicles/${vehicleId}/respond-offer`).set(auth(seller)).send({ decision: 'maybe' });
    expect(bad.status).toBe(400);
    const ok = await request(app).post(`/api/seller/vehicles/${vehicleId}/respond-offer`).set(auth(seller)).send({ decision: 'accept' });
    expect(ok.status).toBe(200);
    expect(ok.body.vehicle.status).toBe('Offer Accepted');
    const again = await request(app).post(`/api/seller/vehicles/${vehicleId}/respond-offer`).set(auth(seller)).send({ decision: 'reject' });
    expect(again.status).toBe(400);
  });
});

describe('reject path', () => {
  test('rejecting an offer is terminal', async () => {
    const { vehicleId, inspectionId } = await submitAndBook();
    await request(app).post(`/api/evaluator/inspections/${inspectionId}/submit`).set(auth(evaluator))
      .send({ ratings: { exterior: 5, interior: 5, mechanical: 5 }, notes: 'Average.', offerPrice: 250000 });
    const res = await request(app).post(`/api/seller/vehicles/${vehicleId}/respond-offer`).set(auth(seller)).send({ decision: 'reject' });
    expect(res.body.vehicle.status).toBe('Offer Rejected');
    const again = await request(app).post(`/api/seller/vehicles/${vehicleId}/respond-offer`).set(auth(seller)).send({ decision: 'accept' });
    expect(again.status).toBe(400);
  });
});
