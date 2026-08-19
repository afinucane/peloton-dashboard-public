"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const result = await r.json().catch(() => null);

    if (!r.ok || !result?.ok) {
      setStatus("Incorrect password");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0B1220",
        color: "#E5E7EB",
        fontFamily: "system-ui",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
          backdropFilter: "blur(8px)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-0.02em" }}>Peloton Dashboard</h1>
        <div style={{ marginTop: 8, color: "rgba(229,231,235,0.65)", fontSize: 14 }}>
          Sign in to continue
        </div>

        <form onSubmit={submit} style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "#E5E7EB",
              borderRadius: 10,
              padding: "12px 14px",
              outline: "none",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#6366F1",
              border: "none",
              color: "white",
              borderRadius: 10,
              padding: "12px 14px",
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop: 12, fontSize: 13, color: "#F59E0B", minHeight: 18 }}>{status}</div>
      </div>
    </main>
  );
}