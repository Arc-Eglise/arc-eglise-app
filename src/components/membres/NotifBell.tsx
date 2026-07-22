"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const TYPE_ICON: Record<string, string> = {
  message: "💬", prayer: "🙏", event: "📅", agenda: "📅",
  rsvp: "✅", stream: "🔴", mail: "📧", system: "🔔",
  sermon: "🎙", don: "💝", lecture: "📖",
};

export default function NotifBell({ userId }: { userId: string }) {
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [open, setOpen]       = useState(false);
  const ref                   = useRef<HTMLDivElement>(null);
  const supabase              = createClient();
  const unread                = notifs.filter(n => !n.read_at).length;

  // Chargement initial + Realtime
  useEffect(() => {
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setNotifs(data); });

    const ch = supabase
      .channel(`notifs:${userId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, ({ new: n }) => {
        setNotifs(prev => [n as Notif, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fermer au clic extérieur
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleOpen() {
    const opening = !open;
    setOpen(opening);
    if (opening && unread > 0) {
      const ids = notifs.filter(n => !n.read_at).map(n => n.id);
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
      setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    }
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="em-hdr-ico" title="Notifications" onClick={handleOpen} style={{ position: "relative" }}>
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            background: "#e53e3e", color: "#fff", borderRadius: "50%",
            fontSize: 9, fontWeight: 700, width: 16, height: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid #1a1d3a", lineHeight: 1,
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          background: "#fff", borderRadius: 16,
          boxShadow: "0 8px 32px rgba(30,36,100,.18)",
          border: "1.5px solid rgba(30,36,100,.1)",
          width: 320, zIndex: 300, overflow: "hidden",
        }}>
          <div style={{
            padding: "13px 16px 10px",
            borderBottom: "1px solid rgba(30,36,100,.08)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1d3a" }}>Notifications</span>
            <span style={{ fontSize: 11, color: "#8890aa" }}>
              {unread === 0 ? "Tout lu" : `${unread} non lu${unread > 1 ? "s" : ""}`}
            </span>
          </div>

          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {notifs.length === 0 ? (
              <div style={{ padding: "28px 16px", textAlign: "center", color: "#8890aa", fontSize: 13 }}>
                Aucune notification
              </div>
            ) : notifs.map(n => (
              <a
                key={n.id}
                href={n.link ?? "#"}
                style={{
                  display: "block", padding: "11px 16px",
                  borderBottom: "1px solid rgba(30,36,100,.06)",
                  background: n.read_at ? "transparent" : "rgba(136,153,204,.08)",
                  textDecoration: "none", transition: "background .15s",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 17, lineHeight: "1.3", flexShrink: 0 }}>
                    {TYPE_ICON[n.type] ?? "🔔"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1d3a", marginBottom: 2 }}>
                      {n.title}
                    </div>
                    {n.body && (
                      <div style={{ fontSize: 12, color: "#6670aa", lineHeight: 1.4 }}>{n.body}</div>
                    )}
                    <div style={{ fontSize: 11, color: "#8890aa", marginTop: 3 }}>
                      {new Date(n.created_at).toLocaleDateString("fr-CH", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </div>
                  {!n.read_at && (
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: "#1E2464", flexShrink: 0, marginTop: 5,
                    }} />
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
