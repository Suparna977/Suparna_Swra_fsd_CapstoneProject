import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from './api.js';

// Loads data when a page opens.   const { data, error, loading, reload } = useLoad(() => api.get('/dashboard'), []);
export function useLoad(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    loader()
      .then((res) => setState({ data: res.data, error: '', loading: false }))
      .catch((err) => setState({ data: null, error: errorMessage(err), loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(load, [load]);
  return { ...state, reload: load, setData: (data) => setState((s) => ({ ...s, data })) };
}
