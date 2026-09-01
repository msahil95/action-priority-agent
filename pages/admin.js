import { useState } from "react";

export default function Admin() {
  const [key, setKey] = useState("");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const res = await fetch(`/api/stats?key=${encodeURIComponent(key)}`);
    if (!res.ok) return setError("Wrong key.");
    setStats(await res.json());
  }

  return (
    <div style={{ maxWidth: 480, margin: "60px auto", fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Usage stats</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="password"
          placeholder="Admin secret"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          style={{ flex: 1, padding: 8, border: "1px solid #E1E4E1", borderRadius: 6 }}
        />
        <button onClick={load} style={{ padding: "8px 14px" }}>View</button>
      </div>
      {error && <p style={{ color: "#E24B4A", fontSize: 13 }}>{error}</p>}
      {stats && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ background: "#F5F7F6", borderRadius: 10, padding: 16, flex: 1 }}>
              <div style={{ fontSize: 12, color: "#5C6470" }}>Total registered</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.total}</div>
            </div>
            <div style={{ background: "#F5F7F6", borderRadius: 10, padding: 16, flex: 1 }}>
              <div style={{ fontSize: 12, color: "#5C6470" }}>Active last 30 days</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.activeLast30}</div>
            </div>
          </div>
          <div style={{ background: "#F5F7F6", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, color: "#5C6470", marginBottom: 6 }}>Satisfaction</div>
            <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#22C55E" }}>👍 {stats.feedback.up}</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#EF4444" }}>👎 {stats.feedback.down}</span>
              {stats.feedback.up + stats.feedback.down > 0 && (
                <span style={{ fontSize: 13, color: "#5C6470" }}>
                  ({Math.round((stats.feedback.up / (stats.feedback.up + stats.feedback.down)) * 100)}% positive)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
