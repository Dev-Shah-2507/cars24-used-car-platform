import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext.jsx';
import { errorMessage } from '../api/api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';

const DEMO = [
  { role: 'Seller', email: 'seller@demo.com', password: 'Seller@123' },
  { role: 'Evaluator', email: 'evaluator@demo.com', password: 'Evaluator@123' },
  { role: 'Admin', email: 'admin@demo.com', password: 'Admin@123' },
  { role: 'Buyer', email: 'buyer@demo.com', password: 'Buyer@123' },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(email, password);
      navigate(homeFor(u.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-intro">
        <h1>AutoHub</h1>
        <p>Sell your car after a proper inspection, or buy one that has already been checked.</p>
      </section>
      <section className="login-panel">
        <h2>Log in</h2>
        <form onSubmit={submit}>
          <label>Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </label>
          <label>Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>
          <ErrorMessage message={error} />
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
        </form>
        <div className="demo-box">
          <p className="muted">Demo accounts. Select one to fill the form.</p>
          <div className="demo-list">
            {DEMO.map((d) => (
              <button key={d.role} type="button" className="btn btn-outline"
                onClick={() => { setEmail(d.email); setPassword(d.password); setError(''); }}>
                {d.role}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
