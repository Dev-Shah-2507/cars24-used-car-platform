import { Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext.jsx';
import Loader from './Loader.jsx';

// UX convenience only. Real enforcement happens in the backend (JWT + role middleware).
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}
