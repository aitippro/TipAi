import { useEffect } from "react";
import { useNavigate } from "react-router";

/**
 * Login page — local-only desktop app stub.
 *
 * TipAi is a LOCAL-ONLY desktop application. Users download the app,
 * configure their own API keys, and use it entirely offline / locally.
 * There is no registration, no network authentication, and no multi-user support.
 *
 * This component exists only as a routing safety net — if anything
 * navigates to /login (e.g. from middleware), it immediately redirects
 * to the home page.
 */
export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    // Local mode: no login needed, redirect to home
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
}
