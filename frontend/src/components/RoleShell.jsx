import { useEffect, useState } from 'react';
import api, { errorMessage } from '../api/api.js';
import Loader from './Loader.jsx';
import ErrorMessage from './ErrorMessage.jsx';

/*
 * Phase 1 dashboard shell. It calls the role's /ping endpoint so the page proves that
 * the backend recognises the logged-in role. Each page is replaced by real screens in later phases.
 */
export default function RoleShell({ role, title, nextPhase }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/${role}/ping`).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, [role]);

  return (
    <main className="container">
      <h1>{title}</h1>
      {!data && !error && <Loader />}
      <ErrorMessage message={error} />
      {data && (
        <div className="card">
          <p>Signed in as <strong>{data.name}</strong>. The backend confirmed your <strong>{data.role}</strong> access.</p>
          <p className="muted">{nextPhase}</p>
        </div>
      )}
    </main>
  );
}
