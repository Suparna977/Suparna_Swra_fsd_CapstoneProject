// Layout shared by the log in and sign up pages: a short pitch on the left, the form on the right.
const STATIONS = ['Foundation', 'Backend', 'Data & UI', 'Security'];

export default function AuthShell({ title, children }) {
  return (
    <div className="auth">
      <aside className="auth-aside">
        <div className="auth-brand">Skill Gap Analyzer</div>
        <h1>Know what to learn next.</h1>
        <p>Add the skills you already have, pick a goal role, and get an ordered plan that closes the gap.</p>

        <svg className="auth-route" viewBox="0 0 320 150" role="img" aria-label="A learning route with four stations">
          {/* dotted = still to do, amber = done. Stations sit exactly on the path. */}
          <path d="M20 120 Q 60 120 100 80 T 200 60 T 300 30" fill="none" stroke="#3B5563" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
          <path d="M20 120 Q 60 120 100 80" fill="none" stroke="#E8A200" strokeWidth="4" strokeLinecap="round" />
          {[[20, 120], [100, 80], [200, 60], [300, 30]].map(([x, y], i) => (
            <g key={STATIONS[i]}>
              <circle cx={x} cy={y} r="8" fill={i < 2 ? '#E8A200' : '#14232C'} stroke={i < 2 ? '#E8A200' : '#7E98A6'} strokeWidth="3" />
              <text x={x} y={i === 3 ? y - 18 : y + 28} fill="#C9D6DC" fontSize="11" textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'} fontFamily="Public Sans, sans-serif">{STATIONS[i]}</text>
            </g>
          ))}
        </svg>
      </aside>

      <section className="auth-main">
        <div className="auth-card">
          <h2>{title}</h2>
          {children}
        </div>
      </section>
    </div>
  );
}
