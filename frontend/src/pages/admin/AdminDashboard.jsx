import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api/api.js';
import Loader from '../../components/Loader.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { inr, formatDate, formatDay } from '../../utils/format.js';

const STATUSES = ['Submitted', 'Inspection Pending', 'Inspection Completed', 'Offer Generated', 'Offer Accepted',
  'Offer Rejected', 'Purchased', 'Under Refurbishment', 'Available for Sale', 'Sold'];

// Summary tiles group the lifecycle into the stages an admin cares about.
const TILES = [
  { label: 'All submissions', statuses: null },
  { label: 'Awaiting inspection', statuses: ['Submitted', 'Inspection Pending'] },
  { label: 'Offers with sellers', statuses: ['Inspection Completed', 'Offer Generated'] },
  { label: 'Ready to purchase', statuses: ['Offer Accepted'] },
  { label: 'In preparation', statuses: ['Purchased', 'Under Refurbishment'] },
  { label: 'Available for sale', statuses: ['Available for Sale'] },
  { label: 'Sold', statuses: ['Sold'] },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats').then((r) => setStats(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => {
    setVehicles(null);
    api.get('/admin/vehicles', { params: filter ? { status: filter } : {} })
      .then((r) => setVehicles(r.data.vehicles))
      .catch((e) => setError(errorMessage(e)));
  }, [filter]);

  const tileCount = (t) => (t.statuses ? t.statuses.reduce((sum, s) => sum + stats.counts[s], 0) : stats.total);

  return (
    <main className="container">
      <div className="page-head">
        <div>
          <h1>Admin dashboard</h1>
          <p className="muted">All submissions, with inspection and offer status.</p>
        </div>
        <Link to="/admin/inventory" className="btn btn-primary">Manage inventory</Link>
      </div>

      <ErrorMessage message={error} />
      {!stats && !error && <Loader />}
      {stats && (
        <div className="tiles">
          {TILES.map((t) => (
            <div key={t.label} className="card tile">
              <p className="tile-count">{tileCount(t)}</p>
              <p className="muted">{t.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="table-head">
        <h2>Vehicle submissions</h2>
        <label className="inline-filter">Status
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      {!vehicles && !error && <Loader />}
      {vehicles && vehicles.length === 0 && <div className="card empty"><p className="muted">No vehicles match this filter.</p></div>}
      {vehicles && vehicles.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>Vehicle</th><th>Seller</th><th>Offer price</th><th>Inspection</th><th>Status</th></tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v._id}>
                  <td><strong>{v.year} {v.make} {v.model}</strong><br /><span className="muted small">{formatDate(v.createdAt)}</span></td>
                  <td>{v.seller?.name}</td>
                  <td>{v.finalOffer != null ? inr(v.finalOffer) : 'Not set'}</td>
                  <td>{v.inspection ? `${v.inspection.status} (${formatDay(v.inspection.appointmentDate)})` : 'Not booked'}</td>
                  <td><StatusBadge status={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
