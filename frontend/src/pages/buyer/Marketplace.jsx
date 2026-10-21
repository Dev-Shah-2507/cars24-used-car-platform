import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/api.js';
import Loader from '../../components/Loader.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import VehicleCard from '../../components/VehicleCard.jsx';

const EMPTY = { search: '', minPrice: '', maxPrice: '', minYear: '', maxYear: '' };

export default function Marketplace() {
  const [form, setForm] = useState(EMPTY);
  const [vehicles, setVehicles] = useState(null);
  const [error, setError] = useState('');

  const fetchVehicles = useCallback((filters) => {
    setVehicles(null);
    setError('');
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    api.get('/buyer/vehicles', { params })
      .then((r) => setVehicles(r.data.vehicles))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => { fetchVehicles(EMPTY); }, [fetchVehicles]);

  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value });
  const apply = (e) => { e.preventDefault(); fetchVehicles(form); };
  const reset = () => { setForm(EMPTY); fetchVehicles(EMPTY); };

  return (
    <main className="container">
      <div className="page-head">
        <div>
          <h1>Certified used cars</h1>
          <p className="muted">Every car here has passed a physical inspection.</p>
        </div>
      </div>

      <form className="card filters" onSubmit={apply}>
        <label className="grow">Search make or model
          <input value={form.search} onChange={set('search')} placeholder="e.g. Honda City" />
        </label>
        <label>Min price (Rs)<input type="number" min={0} value={form.minPrice} onChange={set('minPrice')} /></label>
        <label>Max price (Rs)<input type="number" min={0} value={form.maxPrice} onChange={set('maxPrice')} /></label>
        <label>Year from<input type="number" value={form.minYear} onChange={set('minYear')} /></label>
        <label>Year to<input type="number" value={form.maxYear} onChange={set('maxYear')} /></label>
        <div className="filter-actions">
          <button className="btn btn-primary">Apply</button>
          <button type="button" className="btn btn-outline" onClick={reset}>Reset</button>
        </div>
      </form>

      <ErrorMessage message={error} />
      {!vehicles && !error && <Loader />}
      {vehicles && vehicles.length === 0 && <div className="card empty"><h2>No cars found</h2><p className="muted">Try changing or resetting the filters.</p></div>}
      {vehicles && vehicles.length > 0 && (
        <>
          <p className="muted result-count">{vehicles.length} {vehicles.length === 1 ? 'car' : 'cars'} available</p>
          <div className="market-grid">{vehicles.map((v) => <VehicleCard key={v._id} vehicle={v} />)}</div>
        </>
      )}
    </main>
  );
}
