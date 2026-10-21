// One badge component and one colour mapping used by every role's screens.
const TONE = {
  'Submitted': 'grey',
  'Inspection Pending': 'amber',
  'Inspection Completed': 'blue',
  'Offer Generated': 'blue',
  'Offer Accepted': 'green',
  'Offer Rejected': 'red',
  'Purchased': 'green',
  'Under Refurbishment': 'amber',
  'Available for Sale': 'green',
  'Sold': 'grey',
};

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${TONE[status] || 'grey'}`}>{status}</span>;
}
