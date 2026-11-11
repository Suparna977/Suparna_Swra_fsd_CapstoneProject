import { Link } from 'react-router-dom';
import api from '../api.js';
import { useLoad } from '../hooks.js';
import { CategoryChart, TrendChart } from '../components/charts.jsx';
import { EmptyState, ErrorNote, MilestoneRoute, ReadinessMeter, Spinner } from '../components/ui.jsx';

export default function Dashboard() {
  const { data, error, loading } = useLoad(() => api.get('/dashboard'), []);

  if (loading) return <Spinner label="Loading your dashboard" />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const { roadmap, analysis, nextItem, skillCount } = data;
  const firstName = data.user.name.split(' ')[0];

  // Step 1 and 2 for brand new students
  if (!roadmap) {
    return (
      <>
        <div className="page-head">
          <h1>Hi {firstName}</h1>
          <p>Two steps to your first plan.</p>
        </div>
        <ol className="first-steps">
          <li className={skillCount > 0 ? 'is-done' : ''}>
            <div>
              <h2>Add the skills you already have</h2>
              <p>{skillCount > 0 ? `You have added ${skillCount} ${skillCount === 1 ? 'skill' : 'skills'}.` : 'Choose a level for each skill you know.'}</p>
            </div>
            <Link className={`btn ${skillCount > 0 ? 'btn-secondary' : 'btn-primary'}`} to="/skills">{skillCount > 0 ? 'Edit skills' : 'Add skills'}</Link>
          </li>
          <li>
            <div>
              <h2>Pick a goal role</h2>
              <p>See your gap and turn it into a roadmap.</p>
            </div>
            <Link className={`btn ${skillCount > 0 ? 'btn-primary' : 'btn-secondary'}`} to="/roles">Choose a role</Link>
          </li>
        </ol>
      </>
    );
  }

  const gained = Math.round(roadmap.readinessPct) - Math.round(roadmap.startReadinessPct);

  return (
    <>
      <div className="page-head">
        <h1>Hi {firstName}</h1>
        <p>Your goal: <strong>{roadmap.role.title}</strong></p>
      </div>

      <section className="readiness">
        <div className="readiness-num">
          <strong>{Math.round(roadmap.readinessPct)}%</strong>
          <span>{gained > 0 ? `ready, up ${gained} since you started` : 'ready for this role'}</span>
        </div>
        <div className="readiness-side">
          <ReadinessMeter pct={roadmap.readinessPct} startPct={roadmap.startReadinessPct} />
          <MilestoneRoute completionPct={roadmap.completionPct} milestones={roadmap.milestones} />
          <p className="counts">
            <span><b>{roadmap.completed}</b> of {roadmap.total} steps done</span>
            <span><b>{analysis.counts.strong}</b> strong</span>
            <span><b>{analysis.counts.weak}</b> need work</span>
            <span><b>{analysis.counts.missing}</b> missing</span>
          </p>
        </div>
      </section>

      <section className="next-step">
        {nextItem ? (
          <>
            <div>
              <h2>Next step</h2>
              <p className="next-title">{nextItem.action === 'learn' ? 'Learn' : 'Improve'} {nextItem.skillName}</p>
              <p className="muted">
                About {nextItem.estWeeks} {nextItem.estWeeks === 1 ? 'week' : 'weeks'}, Phase {nextItem.phase}: {nextItem.phaseName}.
                {nextItem.resources[0] && <> Start with <a href={nextItem.resources[0].url} target="_blank" rel="noopener noreferrer">{nextItem.resources[0].title}</a>.</>}
              </p>
            </div>
            <Link className="btn btn-primary" to="/roadmap">Open roadmap</Link>
          </>
        ) : (
          <div>
            <h2>Roadmap complete</h2>
            <p>Every step is done. <Link to="/roles">Choose a new goal role</Link> to keep going.</p>
          </div>
        )}
      </section>

      <div className="two-col">
        <section>
          <h2>Readiness over time</h2>
          {roadmap.history.length > 1 ? (
            <TrendChart history={roadmap.history} />
          ) : (
            <EmptyState title="Nothing to plot yet">Mark your first roadmap step as done and your readiness trend will appear here.</EmptyState>
          )}
        </section>
        <section>
          <h2>Score by category</h2>
          <CategoryChart data={analysis.categoryScores} />
        </section>
      </div>
    </>
  );
}
