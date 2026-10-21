/*
 * Simple, transparent rule-based valuation (no ML, no market data).
 *   value = basePrice(fuel) x ageFactor x mileageFactor x conditionFactor
 * The estimated quote uses the seller's self-declared condition.
 * The final offer uses the evaluator's 1-10 ratings.
 */
const BASE_PRICE = { Petrol: 500000, Diesel: 600000, CNG: 450000, Electric: 800000 };
const SELLER_CONDITION_FACTOR = { poor: 0.8, fair: 0.9, good: 1.0, excellent: 1.05 };
const RATING_WEIGHTS = { mechanical: 0.4, exterior: 0.3, interior: 0.3 };

const roundToThousand = (n) => Math.round(n / 1000) * 1000;

function baseValue({ fuelType, year, mileage }) {
  const age = Math.max(0, new Date().getFullYear() - year);
  const ageFactor = Math.max(0.3, 1 - 0.08 * age);
  const mileageFactor = Math.max(0.5, 1 - mileage / 400000);
  return (BASE_PRICE[fuelType] || BASE_PRICE.Petrol) * ageFactor * mileageFactor;
}

function estimateQuote(vehicle) {
  const c = vehicle.condition;
  const avg =
    (SELLER_CONDITION_FACTOR[c.exterior] +
      SELLER_CONDITION_FACTOR[c.interior] +
      SELLER_CONDITION_FACTOR[c.mechanical]) / 3;
  return roundToThousand(baseValue(vehicle) * avg);
}

function calculateFinalOffer(vehicle, ratings) {
  const score =
    ratings.mechanical * RATING_WEIGHTS.mechanical +
    ratings.exterior * RATING_WEIGHTS.exterior +
    ratings.interior * RATING_WEIGHTS.interior; // 1..10
  const conditionFactor = 0.7 + 0.035 * score;    // 1 -> 0.735, 10 -> 1.05
  return roundToThousand(baseValue(vehicle) * conditionFactor);
}

module.exports = { estimateQuote, calculateFinalOffer };
