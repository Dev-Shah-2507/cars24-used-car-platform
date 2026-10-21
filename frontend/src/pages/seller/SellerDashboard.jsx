import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api/api.js';
import Loader from '../../components/Loader.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { inr, formatDate } from '../../utils/format.js';

export default function SellerDashboard() {
  const [vehicles, setVehicles] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/seller/vehicles')
      .then((r) => setVehicles(r.data.vehicles))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  return (
    <main className="container">
      <div className="page-head">
        <div>
          <h1>Your cars</h1>
          <p className="muted">Submit a car, book an inspection, and get a price offer once our evaluator has checked it.</p>
        </div>
        <Link to="/seller/new" className="btn btn-primary">Sell a car</Link>
      </div>

      <ErrorMessage message={error} />
      {!vehicles && !error && <Loader />}

      {vehicles && vehicles.length === 0 && (
        <div className="card empty">
          <h2>No cars submitted yet</h2>
          <p className="muted">Enter your car's details, then book an inspection to receive an offer.</p>
          <Link to="/seller/new" className="btn btn-primary">Sell your first car</Link>
        </div>
      )}

      {vehicles && vehicles.length > 0 && (
        <div className="vehicle-list">
          {vehicles.map((v) => (
            <Link key={v._id} to={`/seller/vehicles/${v._id}`} className="card vehicle-row">
              <img src={v.imageUrl} alt="" />
              <div className="vehicle-row-main">
                <h3>{v.year} {v.make} {v.model}</h3>
                <p className="muted">{v.mileage.toLocaleString('en-IN')} km, {v.fuelType}, {v.transmission}. Submitted {formatDate(v.createdAt)}</p>
              </div>
              <div className="vehicle-row-side">
                <StatusBadge status={v.status} />
                <p>
                  <span className="muted">Offer</span>{' '}
                  {v.finalOffer != null ? <strong>{inr(v.finalOffer)}</strong> : <span className="muted">Awaiting inspection</span>}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
