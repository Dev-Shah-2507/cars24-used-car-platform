import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/api.js';
import Loader from '../../components/Loader.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { inr } from '../../utils/format.js';

// Vehicles the admin works with: from "Offer Accepted" onwards.
const INVENTORY_STATUSES = ['Offer Accepted', 'Purchased', 'Under Refurbishment', 'Available for Sale', 'Sold'];
const REFURB = ['Not Started', 'In Progress', 'Completed'];
const suggestedPrice = (offer) => Math.round((offer * 1.2) / 1000) * 1000;

function InventoryCard({ vehicle: v, onChanged }) {
  const [price, setPrice] = useState(v.sellingPrice ?? suggestedPrice(v.finalOffer));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (request) => {
    setError('');
    setBusy(true);
    try {
      await request();
      await onChanged();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };
  const setStatus = (status, extra = {}) => run(() => api.patch(`/admin/vehicles/${v._id}/status`, { status, ...extra }));
  const setRefurb = (refurbishmentStatus) => run(() => api.patch(`/admin/vehicles/${v._id}/refurbishment`, { refurbishmentStatus }));

  return (
    <article className="card inventory-card">
      <img src={v.imageUrl} alt="" />
      <div className="inventory-main">
        <div className="inventory-title">
          <h3>{v.year} {v.make} {v.model}</h3>
          <StatusBadge status={v.status} />
        </div>
        <p className="muted">
          Seller: {v.seller?.name} &middot; Offer accepted: <strong>{inr(v.finalOffer)}</strong>
          {v.sellingPrice != null && <> &middot; Selling price: <strong>{inr(v.sellingPrice)}</strong></>}
        </p>

        {v.status === 'Under Refurbishment' && (
          <div className="inline-controls">
            <label>Refurbishment status
              <select value={v.refurbishmentStatus} disabled={busy} onChange={(e) => setRefurb(e.target.value)}>
                {REFURB.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label>Selling price (Rs)
              <input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
          </div>
        )}

        <ErrorMessage message={error} />
        <div className="inventory-actions">
          {v.status === 'Offer Accepted' && <button className="btn btn-primary" disabled={busy} onClick={() => setStatus('Purchased')}>Mark as purchased</button>}
          {v.status === 'Purchased' && <button className="btn btn-primary" disabled={busy} onClick={() => setStatus('Under Refurbishment')}>Start refurbishment</button>}
          {v.status === 'Under Refurbishment' && (
            <button className="btn btn-primary" disabled={busy || v.refurbishmentStatus !== 'Completed' || !price}
              title={v.refurbishmentStatus !== 'Completed' ? 'Set refurbishment to Completed first' : ''}
              onClick={() => setStatus('Available for Sale', { sellingPrice: Number(price) })}>List for sale</button>
          )}
          {v.status === 'Available for Sale' && <button className="btn btn-outline" disabled={busy} onClick={() => setStatus('Sold')}>Mark as sold</button>}
        </div>
      </div>
    </article>
  );
}

export default function InventoryManagement() {
  const [vehicles, setVehicles] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await api.get('/admin/vehicles');
      setVehicles(r.data.vehicles.filter((v) => INVENTORY_STATUSES.includes(v.status)));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const listed = vehicles?.filter((v) => v.status === 'Available for Sale').length ?? 0;

  return (
    <main className="container">
      <div className="page-head">
        <div>
          <h1>Inventory management</h1>
          <p className="muted">Move accepted cars through purchase and refurbishment, then list them for buyers. {vehicles && `${listed} currently listed in the marketplace.`}</p>
        </div>
      </div>
      <ErrorMessage message={error} />
      {!vehicles && !error && <Loader />}
      {vehicles && vehicles.length === 0 && <div className="card empty"><p className="muted">No vehicles are ready for inventory yet. They appear here once a seller accepts an offer.</p></div>}
      <div className="vehicle-list">
        {vehicles?.map((v) => <InventoryCard key={`${v._id}-${v.status}-${v.refurbishmentStatus}`} vehicle={v} onChanged={load} />)}
      </div>
    </main>
  );
}
