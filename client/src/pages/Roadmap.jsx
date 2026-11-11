import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api.js';
import { useLoad } from '../hooks.js';
import { levelLabel } from '../constants.js';
import { EmptyState, ErrorNote, MilestoneRoute, ReadinessMeter, Spinner } from '../components/ui.jsx';

const weeks = (n) => `${n} ${n === 1 ? 'week' : 'weeks'}`;

function stationState(item) {
  if (item.status === 'completed') return 'completed';
  if (item.locked) return 'locked';
  return item.status === 'in_progress' ? 'in_progress' : 'open';
}

export default function Roadmap() {
  const { data, error, loading, setData } = useLoad(() => api.get('/roadmap'), []);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');

  async function update(item, status) {
    setBusyId(item.id);
    setActionError('');
    setMessage('');
    try {
      const res = await api.patch(`/progress/${item.id}`, { status }); // saved in MongoDB
      const before = data.roadmap;
      const after = res.data.roadmap;
      setData({ roadmap: after });

      if (status === 'completed') {
        const newMilestone = after.milestones.filter((m, i) => m.reached && !before.milestones[i].reached).pop();
        const gained = Math.round(after.readinessPct) - Math.round(before.readinessPct);
        setMessage(
          after.status === 'completed'
            ? 'Roadmap complete. Every step is done.'
            : `${item.skillName} done. Readiness is now ${Math.round(after.readinessPct)}%${gained > 0 ? ` (up ${gained})` : ''}.${newMilestone ? ` Milestone reached: ${newMilestone.pct}% of the roadmap.` : ''}`
        );
      }
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Spinner label="Loading your roadmap" />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const roadmap = data.roadmap;
  if (!roadmap) {
    return (
      <>
        <div className="page-head"><h1>Roadmap</h1></div>
        <EmptyState
          title="No roadmap yet"
          action={<Link className="btn btn-primary" to="/roles">Choose a goal role</Link>}
        >
          Pick a goal role and we will turn your skill gap into an ordered plan.
        </EmptyState>
      </>
    );
  }

  const phases = [...new Set(roadmap.items.map((i) => i.phase))].map((p) => {
    const items = roadmap.items.filter((i) => i.phase === p);
    return { phase: p, name: items[0].phaseName, items, done: items.filter((i) => i.status === 'completed').length, weeks: items.reduce((s, i) => s + i.estWeeks, 0) };
  });

  return (
    <>
      <div className="page-head">
        <h1>Roadmap to {roadmap.role.title}</h1>
        <p>
          {roadmap.completed} of {roadmap.total} steps done, about {weeks(roadmap.totalWeeks)} in total.
        </p>
      </div>

      <section className="readiness">
        <div className="readiness-num">
          <strong>{Math.round(roadmap.readinessPct)}%</strong>
          <span>ready, started at {Math.round(roadmap.startReadinessPct)}%</span>
        </div>
        <div className="readiness-side">
          <ReadinessMeter pct={roadmap.readinessPct} startPct={roadmap.startReadinessPct} />
          <MilestoneRoute completionPct={roadmap.completionPct} milestones={roadmap.milestones} />
        </div>
      </section>

      {message && <p className="note note-success" role="status">{message}</p>}
      <ErrorNote>{actionError}</ErrorNote>

      {phases.map((ph) => (
        <section key={ph.phase} className="phase" aria-labelledby={`phase-${ph.phase}`}>
          <div className="phase-head">
            <h2 id={`phase-${ph.phase}`}>Phase {ph.phase}: {ph.name}</h2>
            <span className="muted">{ph.done} of {ph.items.length} done, {weeks(ph.weeks)}</span>
          </div>

          <ol className="route">
            {ph.items.map((item) => {
              const state = stationState(item);
              const busy = busyId === item.id;
              return (
                <li key={item.id} className={`station station-${state}`}>
                  <span className="station-marker" aria-hidden="true" />
                  <div className="station-body">
                    <div className="station-title">
                      <h3>{item.action === 'learn' ? 'Learn' : 'Improve'} {item.skillName}</h3>
                      <span className={`state state-${state}`}>
                        {{ completed: 'Completed', in_progress: 'In progress', open: 'Ready to start', locked: 'Locked' }[state]}
                      </span>
                    </div>
                    <p className="muted">
                      {levelLabel(item.fromLevel)} to {levelLabel(item.targetLevel)}, {weeks(item.estWeeks)}
                      {item.prerequisiteNames.length > 0 && `. Builds on ${item.prerequisiteNames.join(', ')}`}
                    </p>

                    {item.resources.length > 0 && state !== 'completed' && (
                      <details className="resources">
                        <summary>Learning links ({item.resources.length})</summary>
                        <ul>
                          {item.resources.map((r) => (
                            <li key={r.id}>
                              <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a> <span className="muted">({r.type})</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}

                    {state === 'locked' && <p className="small muted">Finish the earlier steps to unlock this one.</p>}
                    {state === 'completed' && item.completedAt && (
                      <p className="small muted">Completed on {new Date(item.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.</p>
                    )}

                    {(state === 'open' || state === 'in_progress') && (
                      <div className="station-actions">
                        {state === 'open' && (
                          <button className="btn btn-secondary" disabled={busy} onClick={() => update(item, 'in_progress')}>Start</button>
                        )}
                        <button className="btn btn-primary" disabled={busy} onClick={() => update(item, 'completed')}>Mark as done</button>
                        {state === 'in_progress' && (
                          <button className="btn btn-quiet" disabled={busy} onClick={() => update(item, 'not_started')}>Back to not started</button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </>
  );
}
