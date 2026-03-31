"use client";

import { useEffect, useState } from "react";

export function SessionDebugWidget() {
  const [sessionInfo, setSessionInfo] = useState<{
    hasSession: boolean;
    userId?: string;
    role?: string;
    agencyId?: string;
  } | null>(null);

  useEffect(() => {
    // Try to get session info from a test endpoint
    fetch("/api/auth/session-debug", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setSessionInfo(data))
      .catch((err) => {
        console.error("Session check failed:", err);
        setSessionInfo({ hasSession: false });
      });
  }, []);

  if (!sessionInfo) return null;

  return (
    <div style={{ position: "fixed", bottom: 10, right: 10, fontSize: "10px", background: "#1a1a1a", color: "#fff", padding: "8px", borderRadius: "4px", maxWidth: "200px", zIndex: 9999 }}>
      <div>Session: {sessionInfo.hasSession ? "✅" : "❌"}</div>
      {sessionInfo.userId && <div>User: {sessionInfo.userId}</div>}
      {sessionInfo.role && <div>Role: {sessionInfo.role}</div>}
      {!sessionInfo.hasSession && <div style={{ color: "red" }}>Not logged in!</div>}
    </div>
  );
}
