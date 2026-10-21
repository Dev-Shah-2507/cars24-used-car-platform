import { Link } from 'react-router-dom';
import { inr } from '../utils/format.js';

// Marketplace card used by the buyer.
export default function VehicleCard({ vehicle: v }) {
  return (
    <Link to={`/marketplace/vehicles/${v._id}`} className="card market-card">
      <img src={v.imageUrl} alt={`${v.make} ${v.model}`} />
      <div className="market-card-body">
        <h3>{v.year} {v.make} {v.model}</h3>
        <p className="muted">{v.mileage.toLocaleString('en-IN')} km, {v.fuelType}, {v.transmission}</p>
        <p className="price">{inr(v.sellingPrice)}</p>
      </div>
    </Link>
  );
}
