// One place that talks to the backend. Every page imports `api` from here.
import axios from 'axios';

// Same website address for frontend and backend, so '/api' is enough.
// (If you host the frontend separately, set VITE_API_URL in the client's environment.)
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

// Attach the login token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A readable message for any failed request
export function errorMessage(err) {
  return err.response?.data?.message || 'Could not reach the server. Check your internet connection and try again.';
}

export default api;
