"use client";

import { useEffect, useState } from "react";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-types";

/** Réglages : choisir quelles notifications recevoir (par fonctionnalité). */
export default function NotifPreferences() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((r) => r.json())
      .then((d) => setPrefs(d.prefs ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggle(key: string, enabled: boolean) {
    const next = { ...prefs, [key]: enabled };
    setPrefs(next);
    setSaving(true);
    await fetch("/api/notifications/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefs: next }),
    }).catch(() => {});
    setSaving(false);
  }

  if (loading) {
    return (
      <div style={{ padding: "24px 16px", textAlign: "center", color: "#8890aa", fontSize: 13 }}>
        Chargement…
      </div>
    );
  }

  return (
    <div style={{ maxHeight: 360, overflowY: "auto" }}>
      <div style={{ padding: "8px 16px 4px", fontSize: 11, color: "#8890aa" }}>
        Choisis les notifications que tu souhaites recevoir.
        {saving && <span style={{ marginLeft: 6, color: "#1E2464" }}>enregistrement…</span>}
      </div>

      {NOTIFICATION_CATEGORIES.map((cat) => {
        const enabled = cat.locked ? true : prefs[cat.key] !== false;
        return (
          <div
            key={cat.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
              borderBottom: "1px solid rgba(30,36,100,.06)",
            }}
          >
            <span style={{ fontSize: 17, flexShrink: 0 }}>{cat.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1d3a" }}>
                {cat.label}
                {cat.locked && (
                  <span style={{ fontSize: 10, color: "#8890aa", marginLeft: 6 }}>(toujours actif)</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#6670aa", lineHeight: 1.35 }}>{cat.description}</div>
            </div>

            <button
              role="switch"
              aria-checked={enabled}
              disabled={cat.locked}
              onClick={() => toggle(cat.key, !enabled)}
              title={enabled ? "Désactiver" : "Activer"}
              style={{
                position: "relative",
                width: 38,
                height: 22,
                borderRadius: 11,
                border: "none",
                flexShrink: 0,
                cursor: cat.locked ? "not-allowed" : "pointer",
                background: enabled ? "#1E7A46" : "#c7ccdd",
                opacity: cat.locked ? 0.55 : 1,
                transition: "background .18s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: enabled ? 18 : 2,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                  transition: "left .18s",
                }}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
