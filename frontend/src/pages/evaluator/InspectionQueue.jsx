import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api/api.js';
import Loader from '../../components/Loader.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { formatDate, formatDay } from '../../utils/format.js';

const TABS = [
  { key: 'Scheduled', label: 'Pending inspections' },
  { key: 'Completed', label: 'Completed' },
];

export default function InspectionQueue() {
  const [tab, setTab] = useState('Scheduled');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setItems(null);
    setError('');
    api.get('/evaluator/inspections', { params: { status: tab } })
      .then((r) => setItems(r.data.inspections))
      .catch((e) => setError(errorMessage(e)));
  }, [tab]);

  return (
    <main className="container">
      <div className="page-head">
        <div>
          <h1>Inspection queue</h1>
          <p className="muted">Open a car to record your ratings and notes and enter your offer price. Submitting the report sends the offer to the seller.</p>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <ErrorMessage message={error} />
      {!items && !error && <Loader />}
      {items && items.length === 0 && (
        <div className="card empty"><p className="muted">{tab === 'Scheduled' ? 'No inspections are waiting right now.' : 'No completed inspections yet.'}</p></div>
      )}

      {items && items.length > 0 && (
        <div className="vehicle-list">
          {items.map((i) => (
            <Link key={i._id} to={`/evaluator/inspections/${i._id}`} className="card vehicle-row">
              <img src={i.vehicle.imageUrl} alt="" />
              <div className="vehicle-row-main">
                <h3>{i.vehicle.year} {i.vehicle.make} {i.vehicle.model}</h3>
                <p className="muted">{i.vehicle.mileage.toLocaleString('en-IN')} km, {i.vehicle.fuelType}, {i.vehicle.transmission}</p>
              </div>
              <div className="vehicle-row-side">
                <StatusBadge status={i.vehicle.status} />
                <p><span className="muted">{i.status === 'Completed' ? 'Completed' : 'Appointment'}</span> <strong>{(i.status === 'Completed' ? formatDate(i.completedAt) : formatDay(i.appointmentDate))}</strong></p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
