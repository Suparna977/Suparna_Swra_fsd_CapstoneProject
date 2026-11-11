// Charts (Recharts)
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

const BLUE = '#1E5BB8';
const INK = '#14232C';
const AMBER = '#E8A200';
const GRID = '#DDE3E1';

export function CategoryChart({ data }) {
  return (
    <div className="chart" role="img" aria-label={`Score by category: ${data.map((d) => `${d.category} ${d.pct} percent`).join(', ')}`}>
      <ResponsiveContainer width="100%" height={Math.max(150, data.length * 44)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke={INK} fontSize={12} />
          <YAxis type="category" dataKey="category" width={96} stroke={INK} fontSize={13} tickLine={false} />
          <Tooltip formatter={(v) => [`${v}%`, 'Score']} cursor={{ fill: 'rgba(30,91,184,0.08)' }} />
          <Bar dataKey="pct" fill={BLUE} radius={[0, 3, 3, 0]} barSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({ history }) {
  const data = history.map((h, i) => ({ label: i === 0 ? 'Start' : `Step ${i}`, pct: Math.round(h.readinessPct) }));
  return (
    <div className="chart" role="img" aria-label={`Readiness over time: ${data.map((d) => `${d.label} ${d.pct} percent`).join(', ')}`}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" stroke={INK} fontSize={12} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke={INK} fontSize={12} width={40} />
          <Tooltip formatter={(v) => [`${v}%`, 'Readiness']} />
          <Line type="monotone" dataKey="pct" stroke={AMBER} strokeWidth={3} dot={{ r: 4, fill: AMBER, stroke: INK, strokeWidth: 1.5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
