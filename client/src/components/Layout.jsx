import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand" aria-label="Skill Gap Analyzer home">
            <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="7" fill="currentColor" />
              <path d="M8 23 L14 15 L19 19 L25 9" stroke="#E8A200" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Skill Gap Analyzer</span>
          </NavLink>

          <nav className="nav" aria-label="Main">
            <NavLink to="/" end>Dashboard</NavLink>
            <NavLink to="/skills">My skills</NavLink>
            <NavLink to="/roles">Goal roles</NavLink>
            <NavLink to="/roadmap">Roadmap</NavLink>
          </nav>

          <div className="userbox">
            <span className="username">{user.name}</span>
            <button className="btn btn-quiet" onClick={handleLogout}>Log out</button>
          </div>
        </div>
      </header>
      <main id="main" className="page">
        <Outlet />
      </main>
    </>
  );
}
