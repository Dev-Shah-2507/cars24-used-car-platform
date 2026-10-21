/*
 * The ONLY place that defines the vehicle lifecycle.
 * Every controller that changes Vehicle.status must call assertTransition().
 */
const STATUSES = [
  'Submitted',
  'Inspection Pending',
  'Inspection Completed',
  'Offer Generated',
  'Offer Accepted',
  'Offer Rejected',
  'Purchased',
  'Under Refurbishment',
  'Available for Sale',
  'Sold',
];

const TRANSITIONS = {
  'Submitted': ['Inspection Pending'],                 // seller books inspection
  'Inspection Pending': ['Inspection Completed'],      // evaluator submits report
  'Inspection Completed': ['Offer Generated'],         // system generates final offer
  'Offer Generated': ['Offer Accepted', 'Offer Rejected'], // seller decides
  'Offer Accepted': ['Purchased'],                     // admin
  'Offer Rejected': [],                                // terminal
  'Purchased': ['Under Refurbishment'],                // admin
  'Under Refurbishment': ['Available for Sale'],       // admin (needs refurb Completed + price)
  'Available for Sale': ['Sold'],                      // admin
  'Sold': [],                                          // terminal
};

function canTransition(from, to) {
  return Array.isArray(TRANSITIONS[from]) && TRANSITIONS[from].includes(to);
}

function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    const err = new Error(`Invalid status change: "${from}" cannot move to "${to}".`);
    err.statusCode = 400;
    throw err;
  }
}

module.exports = { STATUSES, TRANSITIONS, canTransition, assertTransition };
