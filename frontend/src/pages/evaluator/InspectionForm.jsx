import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../../api/api.js';
import Loader from '../../components/Loader.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { inr, formatDate, formatDay } from '../../utils/format.js';

const PARTS = [
  ['exterior', 'Exterior'],
  ['interior', 'Interior'],
  ['mechanical', 'Mechanical'],
];

export default function InspectionForm() {
  const { id } = useParams();
  const [inspection, setInspection] = useState(null);
  const [ratings, setRatings] = useState({ exterior: '', interior: '', mechanical: '' });
  const [notes, setNotes] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`/evaluator/inspections/${id}`)
      .then((r) => setInspection(r.data.inspection))
      .catch((e) => setError(errorMessage(e)));
  }, [id]);
  useEffect(load, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.post(`/evaluator/inspections/${id}/submit`, {
        ratings: { exterior: Number(ratings.exterior), interior: Number(ratings.interior), mechanical: Number(ratings.mechanical) },
        notes,
        offerPrice: Number(offerPrice),
      });
      setNotice(`Report submitted. Offer sent to the seller: ${inr(res.data.vehicle.finalOffer)}.`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (error && !inspection) return <main className="container"><ErrorMessage message={error} /><Link to="/evaluator">Back to queue</Link></main>;
  if (!inspection) return <main className="container"><Loader /></main>;

  const v = inspection.vehicle;
  const done = inspection.status === 'Completed';

  return (
    <main className="container">
      <Link to="/evaluator" className="back-link">Back to queue</Link>
      <div className="page-head">
        <h1>{v.year} {v.make} {v.model}</h1>
        <StatusBadge status={v.status} />
      </div>
      {notice && <div className="alert alert-success" role="status">{notice}</div>}

      <div className="details-grid">
        <section className="card">
          <img className="detail-img" src={v.imageUrl} alt={`${v.make} ${v.model}`} />
          <h2>Vehicle details</h2>
          <dl className="spec-list">
            <dt>Seller</dt><dd>{v.seller?.name}</dd>
            <dt>Manufacturing year</dt><dd>{v.year}</dd>
            <dt>Kilometres driven</dt><dd>{v.mileage.toLocaleString('en-IN')} km</dd>
            <dt>Fuel type</dt><dd>{v.fuelType}</dd>
            <dt>Transmission</dt><dd>{v.transmission}</dd>
            <dt>Seller's claim</dt>
            <dd className="cap">Exterior {v.condition.exterior}, interior {v.condition.interior}, mechanical {v.condition.mechanical}</dd>
            <dt>Appointment date</dt><dd>{formatDay(inspection.appointmentDate)}</dd>
          </dl>
        </section>

        <section className="card">
          {done ? (
            <>
              <h2>Inspection report</h2>
              <dl className="spec-list">
                <dt>Inspected by</dt><dd>{inspection.evaluator?.name || '-'}</dd>
                <dt>Completed on</dt><dd>{formatDate(inspection.completedAt)}</dd>
                <dt>Exterior</dt><dd>{inspection.ratings.exterior} / 10</dd>
                <dt>Interior</dt><dd>{inspection.ratings.interior} / 10</dd>
                <dt>Mechanical</dt><dd>{inspection.ratings.mechanical} / 10</dd>
                <dt>Notes</dt><dd>{inspection.notes}</dd>
                <dt>Offer price</dt><dd>{inr(v.finalOffer)}</dd>
              </dl>
            </>
          ) : (
            <form onSubmit={submit}>
              <h2>Record inspection</h2>
              <p className="muted small">Rate each area from 1 (very poor) to 10 (excellent).</p>
              <div className="form-grid three">
                {PARTS.map(([key, label]) => (
                  <label key={key}>{label}
                    <input type="number" min={1} max={10} step={1} required placeholder="1-10" value={ratings[key]}
                      onChange={(e) => setRatings({ ...ratings, [key]: e.target.value })} />
                  </label>
                ))}
              </div>
              <label>Inspection notes
                <textarea rows={5} required maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Condition summary, defects found, repairs needed..." />
              </label>
              <label>Offer price for this car (Rs)
                <input type="number" min={1} step={1} required value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)}
                  placeholder="Amount you offer the seller, e.g. 450000" />
              </label>
              <ErrorMessage message={error} />
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Submitting...' : 'Submit report and send offer'}</button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
