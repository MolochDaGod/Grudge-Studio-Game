/**
 * /auth/callback — lands here from id.grudge-studio.com?grudge_token=...
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  consumeFleetSsoParams,
  bridgeLaunchToken,
  verifyToken,
  setToken,
} from "@/lib/grudge-api";
import { useAuthStore } from "@/store/use-auth-store";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { token } = consumeFleetSsoParams();
        if (token) {
          // Try bridge exchange (ID launch token → Railway JWT)
          const bridged = await bridgeLaunchToken(token).catch(() => null);
          if (!bridged) {
            setToken(token);
          }
        }
        const verified = await verifyToken();
        if (cancelled) return;
        if (verified) {
          await restoreSession();
          setMsg("Welcome back — loading…");
          setLocation("/");
          return;
        }
        setMsg("Sign-in incomplete. Redirecting to login…");
        setTimeout(() => setLocation("/login"), 1200);
      } catch (e: any) {
        if (cancelled) return;
        setMsg(e?.message || "Auth failed");
        setTimeout(() => setLocation("/login"), 1800);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restoreSession, setLocation]);

  return (
    <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center text-white/70 text-sm tracking-wider uppercase">
      <div className="w-10 h-10 border-2 border-primary/40 border-t-primary rounded-full animate-spin mb-4" />
      {msg}
    </div>
  );
}
