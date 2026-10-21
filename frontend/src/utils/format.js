export const inr = (n) => (n == null ? 'Not available yet' : `₹${Number(n).toLocaleString('en-IN')}`);

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

// Appointment dates are calendar days stored at UTC midnight, so they must be shown in UTC to avoid a day-off shift.
export const formatDay = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-';

// yyyy-mm-dd for today in the user's local time (for <input type="date" min=...>)
export const todayInputValue = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
