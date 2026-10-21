import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import api, { errorMessage } from '../../api/api.js';
import Loader from '../../components/Loader.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { inr, formatDate, formatDay, todayInputValue } from '../../utils/format.js';

// What the seller should expect at each stage (plain language, same status names as every other role).
const NEXT_STEP = {
  'Submitted': 'Book an inspection. After the evaluator checks your car, your price offer appears here.',
  'Inspection Pending': 'An evaluator will inspect your car on the booked date. Your price offer appears here afterwards.',
  'Inspection Completed': 'The inspection is done. Your offer is being prepared.',
  'Offer Generated': 'Your offer is ready. Accept or reject it below.',
  'Offer Accepted': 'You accepted the offer. Our team will complete the purchase.',
  'Offer Rejected': 'You rejected the offer. This submission is closed.',
  'Purchased': 'We have purchased your car. Thank you.',
  'Under Refurbishment': 'We have purchased your car. Thank you.',
  'Available for Sale': 'We have purchased your car. Thank you.',
  'Sold': 'We have purchased your car. Thank you.',
};

export default function VehicleDetails() {
  const { id } = useParams();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(location.state?.justSubmitted ? 'Your car was submitted. Book an inspection to receive a price offer.' : '');

  const load = useCallback(() => {
    api.get(`/seller/vehicles/${id}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  useEffect(load, [load]);

  const book = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await api.post(`/seller/vehicles/${id}/book-inspection`, { appointmentDate: date });
      setNotice('Inspection booked.');
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const respond = async (decision) => {
    if (decision === 'reject' && !window.confirm('Reject this offer? This cannot be undone.')) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await api.post(`/seller/vehicles/${id}/respond-offer`, { decision });
      setNotice(decision === 'accept' ? 'Offer accepted.' : 'Offer rejected.');
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <main className="container"><ErrorMessage message={error} /><Link to="/seller">Back to your cars</Link></main>;
  if (!data) return <main className="container"><Loader /></main>;

  const { vehicle: v, inspection } = data;

  return (
    <main className="container">
      <Link to="/seller" className="back-link">Back to your cars</Link>
      <div className="page-head">
        <h1>{v.year} {v.make} {v.model}</h1>
        <StatusBadge status={v.status} />
      </div>

      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      <ErrorMessage message={error} />

      <div className="details-grid">
        <section className="card">
          <img className="detail-img" src={v.imageUrl} alt={`${v.make} ${v.model}`} />
          <h2>Specifications</h2>
          <dl className="spec-list">
            <dt>Manufacturing year</dt><dd>{v.year}</dd>
            <dt>Kilometres driven</dt><dd>{v.mileage.toLocaleString('en-IN')} km</dd>
            <dt>Fuel type</dt><dd>{v.fuelType}</dd>
            <dt>Transmission</dt><dd>{v.transmission}</dd>
            <dt>Your condition ratings</dt>
            <dd className="cap">Exterior {v.condition.exterior}, interior {v.condition.interior}, mechanical {v.condition.mechanical}</dd>
          </dl>
        </section>

        <div className="stack">
          <section className="card">
            <h2>Price offer</h2>
            {v.finalOffer != null ? (
              <>
                <p className="price">{inr(v.finalOffer)}</p>
                <p className="muted small">Offered after the physical inspection of your car.</p>
              </>
            ) : (
              <>
                <p className="price pending">Not available yet</p>
                <p className="muted small">The evaluator sets the price after inspecting your car.</p>
              </>
            )}
            <p className="next-step">{NEXT_STEP[v.status]}</p>
            {v.status === 'Offer Generated' && (
              <div className="offer-actions">
                <button className="btn btn-primary" disabled={busy} onClick={() => respond('accept')}>Accept offer</button>
                <button className="btn btn-outline" disabled={busy} onClick={() => respond('reject')}>Reject offer</button>
              </div>
            )}
          </section>

          <section className="card">
            <h2>Inspection</h2>
            {!inspection && v.status === 'Submitted' && (
              <form onSubmit={book}>
                <label>Preferred inspection date
                  <input type="date" value={date} min={todayInputValue()} onChange={(e) => setDate(e.target.value)} required />
                </label>
                <button className="btn btn-primary" disabled={busy || !date}>{busy ? 'Booking...' : 'Book inspection'}</button>
              </form>
            )}
            {inspection && (
              <dl className="spec-list">
                <dt>Status</dt><dd>{inspection.status}</dd>
                <dt>Appointment date</dt><dd>{formatDay(inspection.appointmentDate)}</dd>
                {inspection.status === 'Completed' && (<>
                  <dt>Completed on</dt><dd>{formatDate(inspection.completedAt)}</dd>
                  <dt>Ratings (out of 10)</dt>
                  <dd>Exterior {inspection.ratings.exterior}, interior {inspection.ratings.interior}, mechanical {inspection.ratings.mechanical}</dd>
                  {inspection.notes && (<><dt>Evaluator notes</dt><dd>{inspection.notes}</dd></>)}
                </>)}
              </dl>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
