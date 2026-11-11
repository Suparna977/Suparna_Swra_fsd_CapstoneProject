import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';
import { Spinner } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Skills from './pages/Skills.jsx';
import Roles from './pages/Roles.jsx';
import Analysis from './pages/Analysis.jsx';
import Roadmap from './pages/Roadmap.jsx';

// Pages that need a login. Anyone else is sent to /login.
function Private({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Loading" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

// Login / sign up pages. Someone already logged in is sent to the dashboard.
function Public({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Loading" />;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Public><Login /></Public>} />
      <Route path="/register" element={<Public><Register /></Public>} />

      <Route element={<Private><Layout /></Private>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/roles" element={<Roles />} />
        <Route path="/analysis/:roleId" element={<Analysis />} />
        <Route path="/roadmap" element={<Roadmap />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
