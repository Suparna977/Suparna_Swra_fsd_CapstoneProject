// Small reusable pieces used on several pages.
import { STATUS_TEXT } from '../constants.js';

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return <p className="note note-error" role="alert">{children}</p>;
}

// Strong / Needs work / Missing - always colour AND text
export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUS_TEXT[status]}</span>;
}

// The readiness bar. `startPct` draws a tick where the student began.
export function ReadinessMeter({ pct, startPct }) {
  const value = Math.round(pct);
  return (
    <div className="meter" role="img" aria-label={`Readiness ${value} percent`}>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${Math.min(100, pct)}%` }} />
        {startPct !== undefined && startPct !== null && startPct < pct && (
          <div className="meter-start" style={{ left: `${startPct}%` }} title={`Started at ${Math.round(startPct)}%`} />
        )}
      </div>
    </div>
  );
}

// Milestones 25 / 50 / 75 / 100 drawn as stations on a line
export function MilestoneRoute({ completionPct, milestones }) {
  return (
    <div className="milestones" role="img" aria-label={`${completionPct} percent of the roadmap completed`}>
      <div className="milestones-line">
        <div className="milestones-done" style={{ width: `${completionPct}%` }} />
        {milestones.map((m) => (
          <span key={m.pct} className={`station-dot${m.reached ? ' reached' : ''}`} style={{ left: `${m.pct}%` }} />
        ))}
      </div>
      <div className="milestones-labels" aria-hidden="true">
        {milestones.map((m) => (
          <span key={m.pct} style={{ left: `${m.pct}%` }} className={m.reached ? 'reached' : ''}>{m.pct}%</span>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
