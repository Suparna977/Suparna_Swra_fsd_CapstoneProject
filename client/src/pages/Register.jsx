import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { errorMessage } from '../api.js';
import AuthShell from '../components/AuthShell.jsx';
import { ErrorNote } from '../components/ui.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');

    // Quick checks here so the person gets instant feedback. The server checks again.
    if (form.name.trim().length < 2) return setError('Enter your name (at least 2 characters).');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');

    setBusy(true);
    try {
      await register(form.name.trim(), form.email, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account">
      <form onSubmit={submit} noValidate>
        <label className="field">
          <span>Name</span>
          <input name="name" autoComplete="name" value={form.name} onChange={change} required />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" value={form.email} onChange={change} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input name="password" type="password" autoComplete="new-password" value={form.password} onChange={change} required aria-describedby="pw-hint" />
          <small id="pw-hint">At least 8 characters.</small>
        </label>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account...' : 'Create account'}</button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthShell>
  );
}
