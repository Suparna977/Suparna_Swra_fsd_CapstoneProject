import { Link } from 'react-router-dom';
import api from '../api.js';
import { useLoad } from '../hooks.js';
import { ErrorNote, Spinner } from '../components/ui.jsx';

export default function Roles() {
  const { data, error, loading } = useLoad(() => api.get('/roles'), []);

  if (loading) return <Spinner label="Loading roles" />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  return (
    <>
      <div className="page-head">
        <h1>Goal roles</h1>
        <p>Pick the role you want. You will see how your skills compare to what it needs.</p>
      </div>

      <ul className="role-list">
        {data.roles.map((r) => (
          <li key={r.id} className="role">
            <div className="role-text">
              <h2>{r.title}</h2>
              <p>{r.description}</p>
              <p className="muted">{r.domain}, {r.skillCount} skills required</p>
            </div>
            <Link className="btn btn-secondary" to={`/analysis/${r.id}`} aria-label={`See gap analysis for ${r.title}`}>
              See my gap
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
