import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../../api/api.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';

const FUELS = ['Petrol', 'Diesel', 'CNG', 'Electric'];
const TRANSMISSIONS = ['Manual', 'Automatic'];
const LEVELS = ['poor', 'fair', 'good', 'excellent'];
const thisYear = new Date().getFullYear();

const EMPTY = {
  make: '', model: '', year: thisYear - 3, mileage: '', fuelType: 'Petrol', transmission: 'Manual',
  exterior: 'good', interior: 'good', mechanical: 'good',
};

export default function VehicleForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { exterior, interior, mechanical, ...rest } = form;
      const res = await api.post('/seller/vehicles', {
        ...rest,
        year: Number(form.year),
        mileage: Number(form.mileage),
        condition: { exterior, interior, mechanical },
      });
      navigate(`/seller/vehicles/${res.data.vehicle._id}`, { state: { justSubmitted: true } });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const select = (field, options) => (
    <select value={form[field]} onChange={set(field)}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <main className="container narrow">
      <Link to="/seller" className="back-link">Back to your cars</Link>
      <h1>Sell your car</h1>
      <p className="muted">Tell us about your car. Our evaluator will inspect it and give you a price after the inspection.</p>

      <form className="card" onSubmit={submit}>
        <div className="form-grid">
          <label>Make
            <input value={form.make} onChange={set('make')} placeholder="e.g. Maruti Suzuki" required maxLength={50} />
          </label>
          <label>Model
            <input value={form.model} onChange={set('model')} placeholder="e.g. Swift VXi" required maxLength={50} />
          </label>
          <label>Manufacturing year
            <input type="number" value={form.year} onChange={set('year')} min={1990} max={thisYear} required />
          </label>
          <label>Kilometres driven
            <input type="number" value={form.mileage} onChange={set('mileage')} min={0} max={1000000} required />
          </label>
          <label>Fuel type {select('fuelType', FUELS)}</label>
          <label>Transmission {select('transmission', TRANSMISSIONS)}</label>
        </div>

        <h2 className="form-section">Your view of the car's condition</h2>
        <div className="form-grid three">
          <label>Exterior {select('exterior', LEVELS)}</label>
          <label>Interior {select('interior', LEVELS)}</label>
          <label>Engine and mechanics {select('mechanical', LEVELS)}</label>
        </div>

        <ErrorMessage message={error} />
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Submitting...' : 'Submit car'}</button>
      </form>
    </main>
  );
}
