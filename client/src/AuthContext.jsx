// Keeps track of who is logged in, for the whole app.
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check a saved token

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  // On page load: if a token is saved, ask the server who it belongs to.
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  // If the token expires while using the app, send the person back to the login page.
  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (err) => {
        const isAuthForm = err.config?.url?.startsWith('/auth/login') || err.config?.url?.startsWith('/auth/register');
        if (err.response?.status === 401 && !isAuthForm) logout();
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, [logout]);

  async function authenticate(path, body) {
    const res = await api.post(path, body);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  }

  const login = (email, password) => authenticate('/auth/login', { email, password });
  const register = (name, email, password) => authenticate('/auth/register', { name, email, password });

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
