import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext.jsx';

const LINKS = {
  seller: [{ to: '/seller', label: 'My cars', end: true }, { to: '/seller/new', label: 'Sell a car' }],
  evaluator: [{ to: '/evaluator', label: 'Inspection queue', end: true }],
  admin: [{ to: '/admin', label: 'Dashboard', end: true }, { to: '/admin/inventory', label: 'Inventory' }],
  buyer: [{ to: '/marketplace', label: 'Marketplace', end: true }],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <header className="navbar">
      <Link to={homeFor(user.role)} className="brand">AutoHub</Link>
      <nav className="nav-links">
        {(LINKS[user.role] || []).map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>{l.label}</NavLink>
        ))}
      </nav>
      <div className="nav-right">
        <span className="nav-user">{user.name} <em className="role-tag">{user.role}</em></span>
        <button className="btn btn-ghost" onClick={() => { logout(); navigate('/login'); }}>Log out</button>
      </div>
    </header>
  );
}
