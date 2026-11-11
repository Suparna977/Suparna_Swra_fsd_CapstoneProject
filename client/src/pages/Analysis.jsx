import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api.js';
import { useLoad } from '../hooks.js';
import { levelLabel } from '../constants.js';
import { CategoryChart } from '../components/charts.jsx';
import { ErrorNote, ReadinessMeter, Spinner, StatusBadge } from '../components/ui.jsx';

export default function Analysis() {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const { data, error, loading } = useLoad(
    () => Promise.all([api.post('/analysis', { roleId }), api.get('/roadmap'), api.get('/profile')]).then(([a, r, p]) => ({ data: { ...a.data, hasRoadmap: !!r.data.roadmap, skillCount: p.data.skills.length } })),
    [roleId]
  );
  const [busy, setBusy] = useState(false);
  const [buildError, setBuildError] = useState('');

  async function buildRoadmap() {
    setBusy(true);
    setBuildError('');
    try {
      await api.post('/roadmap/generate', { roleId });
      navigate('/roadmap');
    } catch (err) {
      setBuildError(errorMessage(err));
      setBusy(false);
    }
  }

  if (loading) return <Spinner label="Comparing your skills" />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const { role, readinessPct, counts, skills, categoryScores, alternatives } = data;
  const hasGap = counts.weak + counts.missing > 0;

  return (
    <>
      <div className="page-head">
        <p className="crumb"><Link to="/roles">Goal roles</Link></p>
        <h1>{role.title}</h1>
        <p>{role.description}</p>
      </div>

      {data.skillCount === 0 && (
        <p className="note note-info">
          You have not added any skills yet, so everything shows as missing. <Link to="/skills">Add your skills</Link> for a real result.
        </p>
      )}

      <section className="readiness">
        <div className="readiness-num">
          <strong>{Math.round(readinessPct)}%</strong>
          <span>ready for this role</span>
        </div>
        <div className="readiness-side">
          <ReadinessMeter pct={readinessPct} />
          <p className="counts">
            <span><b>{counts.strong}</b> strong</span>
            <span><b>{counts.weak}</b> need work</span>
            <span><b>{counts.missing}</b> missing</span>
          </p>
        </div>
      </section>

      <section>
        <h2>Skill by skill</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Skill</th>
                <th scope="col">Required</th>
                <th scope="col">You</th>
                <th scope="col">Weight</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...skills].sort((a, b) => b.weight - a.weight).map((s) => (
                <tr key={s.skillId}>
                  <th scope="row">{s.name}</th>
                  <td>{levelLabel(s.requiredLevel)}</td>
                  <td>{levelLabel(s.currentLevel)}</td>
                  <td>{s.weight} of 5</td>
                  <td><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">Weight shows how much a skill counts toward your readiness score.</p>
      </section>

      <section>
        <h2>Score by category</h2>
        <CategoryChart data={categoryScores} />
      </section>

      {alternatives.length > 0 && (
        <section>
          <h2>Roles you are already close to</h2>
          <ul className="alt-list">
            {alternatives.map((a) => (
              <li key={a.roleId}>
                <span>{a.title}</span>
                <span className="alt-pct">{Math.round(a.matchPct)}% match</span>
                <Link to={`/analysis/${a.roleId}`}>See gap</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="cta-bar">
        {hasGap ? (
          <>
            <div>
              <h2>Ready to close the gap?</h2>
              <p>We will order the {counts.weak + counts.missing} skills you need so prerequisites always come first.{data.hasRoadmap && ' This replaces your current roadmap.'}</p>
            </div>
            <button className="btn btn-primary" onClick={buildRoadmap} disabled={busy}>
              {busy ? 'Building...' : 'Build my roadmap'}
            </button>
          </>
        ) : (
          <div>
            <h2>You meet every requirement</h2>
            <p>Nothing left to learn for this role. Try another goal role.</p>
          </div>
        )}
      </section>
      <ErrorNote>{buildError}</ErrorNote>
    </>
  );
}
