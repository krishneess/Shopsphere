import { useEffect, useState } from "react";
import api from "../../api";

/**
 * Small GET helper for the analytics modules.
 * Re-fetches whenever the path or params change and keeps the previous
 * result on screen while the next one loads (no flicker when a control changes).
 */
export default function useApi(path, params, enabled = true) {
  const key = enabled ? `${path}?${JSON.stringify(params || {})}` : null;
  const [state, setState] = useState({ key: null, data: null, error: "" });

  useEffect(() => {
    if (!key) return undefined;
    let active = true;

    api
      .get(path, { params })
      .then((response) => {
        if (active) setState({ key, data: response.data, error: "" });
      })
      .catch((err) => {
        if (!active) return;
        setState({
          key,
          data: null,
          error:
            err.response?.data?.message ||
            err.message ||
            "Unable to load results. Check that the backend server is running.",
        });
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    data: state.data,
    error: state.key === key ? state.error : "",
    loading: Boolean(key) && state.key !== key,
  };
}
