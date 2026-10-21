import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../../api/api.js';
import Loader from '../../components/Loader.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import { inr, formatDate } from '../../utils/format.js';

export default function VehicleDetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/buyer/vehicles/${id}`).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, [id]);

  if (error) return <main className="container"><ErrorMessage message={error} /><Link to="/marketplace">Back to marketplace</Link></main>;
  if (!data) return <main className="container"><Loader /></main>;

  const { vehicle: v, inspection } = data;
  return (
    <main className="container">
      <Link to="/marketplace" className="back-link">Back to marketplace</Link>
      <div className="page-head">
        <h1>{v.year} {v.make} {v.model}</h1>
        <span className="badge badge-green">Available</span>
      </div>

      <div className="details-grid">
        <section className="card">
          <img className="detail-img" src={v.imageUrl} alt={`${v.make} ${v.model}`} />
          <p className="price">{inr(v.sellingPrice)}</p>
          <h2>Specifications</h2>
          <dl className="spec-list">
            <dt>Make</dt><dd>{v.make}</dd>
            <dt>Model</dt><dd>{v.model}</dd>
            <dt>Manufacturing year</dt><dd>{v.year}</dd>
            <dt>Kilometres driven</dt><dd>{v.mileage.toLocaleString('en-IN')} km</dd>
            <dt>Fuel type</dt><dd>{v.fuelType}</dd>
            <dt>Transmission</dt><dd>{v.transmission}</dd>
            <dt>Availability</dt><dd>{v.status}</dd>
          </dl>
        </section>

        <section className="card">
          <h2>Inspection summary</h2>
          {inspection ? (
            <>
              <div className="rating-bars">
                {['exterior', 'interior', 'mechanical'].map((k) => (
                  <div key={k} className="rating-row">
                    <span className="cap">{k}</span>
                    <div className="bar" aria-hidden="true"><div style={{ width: `${inspection.ratings[k] * 10}%` }} /></div>
                    <strong>{inspection.ratings[k]}/10</strong>
                  </div>
                ))}
              </div>
              <p className="inspector-notes">{inspection.notes}</p>
              <p className="muted small">Inspected on {formatDate(inspection.completedAt)}</p>
            </>
          ) : <p className="muted">No inspection summary is available.</p>}
        </section>
      </div>
    </main>
  );
}
