"use client";

import { useEffect, useState } from "react";
import {
  pushSupported,
  registerSW,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
} from "@/lib/push-client";

/** Toggle d'activation des notifications push (Web Push PWA). */
export default function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    setSupported(true);
    setDenied(Notification.permission === "denied");
    (async () => {
      try {
        await registerSW();
        setOn(await isSubscribed());
      } catch (e) {
        console.error("[push] register", e);
      }
    })();
  }, []);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (on) {
        await unsubscribeFromPush();
        setOn(false);
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setDenied(perm === "denied");
          return;
        }
        setOn(await subscribeToPush());
      }
    } catch (e) {
      console.error("[push] toggle", e);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  if (denied) {
    return (
      <span style={{ fontSize: 11, color: "#b0455f" }} title="Notifications bloquées dans le navigateur">
        🔕 Push bloqué
      </span>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={on ? "Désactiver les notifications push" : "Activer les notifications push"}
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: on ? "#1E7A46" : "#1E2464",
        background: on ? "rgba(30,122,70,.1)" : "rgba(30,36,100,.08)",
        border: "none",
        borderRadius: 8,
        padding: "3px 8px",
        cursor: busy ? "default" : "pointer",
        opacity: busy ? 0.6 : 1,
        transition: "background .15s",
      }}
    >
      {busy ? "…" : on ? "🔔 Push activé" : "🔕 Activer le push"}
    </button>
  );
}
