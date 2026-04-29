import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    // Local mode: no login needed, redirect to home
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
}
