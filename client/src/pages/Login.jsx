import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { errorMessage } from '../api.js';
import AuthShell from '../components/AuthShell.jsx';
import { ErrorNote } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Log in">
      <form onSubmit={submit} noValidate>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" value={form.email} onChange={change} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" value={form.password} onChange={change} required />
        </label>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
      </form>
      <p className="auth-switch">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </AuthShell>
  );
}
