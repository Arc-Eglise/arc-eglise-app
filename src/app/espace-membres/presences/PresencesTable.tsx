"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkInEvent, cancelCheckIn } from "@/lib/actions/membres";
import { getGroup, GROUPS } from "@/lib/groups";

interface EventCol {
  id: string;
  title: string;
  date: string;
  time_start: string | null;
  location: string | null;
}

interface MemberRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  groups: string[];
}

interface Props {
  events:           EventCol[];
  members:          MemberRow[];
  attendMap:        Record<string, string[]>; // event_id → user_id[]
  totalEvents:      number;
  pageSize:         number;
  offset:           number;
  currentUserId:    string;
  myCheckedEventIds: string[];
  isAdmin:          boolean;
}

const ALL_GROUPS = GROUPS.map(g => g.name);

export default function PresencesTable({
  events, members, attendMap, totalEvents, pageSize, offset,
  currentUserId, myCheckedEventIds, isAdmin,
}: Props) {
  const router   = useRouter();
  const [, startT] = useTransition();

  // checkins optimistes pour l'utilisateur courant
  const [myChecked, setMyChecked] = useState<Set<string>>(new Set(myCheckedEventIds));
  // checkins admin optimistes : map eventId → Set<userId>
  const [localAttend, setLocalAttend] = useState<Record<string, Set<string>>>(
    () => Object.fromEntries(Object.entries(attendMap).map(([k, v]) => [k, new Set(v)]))
  );

  // Modal "Déclarer ma présence"
  const [declModal, setDeclModal] = useState(false);
  const [declEventId, setDeclEventId] = useState<string>(events[0]?.id ?? "");

  // Vue : par groupe ou liste plate
  const [groupView, setGroupView] = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const pastEvents = events.filter(e => e.date <= today);

  function navigate(newOffset: number) {
    router.push(`/espace-membres/presences?offset=${newOffset}`);
  }

  function toggleMyCheckIn(eventId: string) {
    const wasChecked = myChecked.has(eventId);
    const next = new Set(myChecked);
    const nextAttend = { ...localAttend };
    if (!nextAttend[eventId]) nextAttend[eventId] = new Set();

    if (wasChecked) {
      next.delete(eventId);
      nextAttend[eventId]!.delete(currentUserId);
    } else {
      next.add(eventId);
      nextAttend[eventId]!.add(currentUserId);
    }
    setMyChecked(next);
    setLocalAttend(nextAttend);
    startT(async () => {
      if (wasChecked) await cancelCheckIn(eventId);
      else            await checkInEvent(eventId);
    });
  }

  function toggleAdminCheckIn(eventId: string, userId: string) {
    const set = new Set(localAttend[eventId] ?? []);
    if (set.has(userId)) set.delete(userId);
    else set.add(userId);
    setLocalAttend({ ...localAttend, [eventId]: set });
    startT(async () => {
      if (set.has(userId)) await checkInEvent(eventId, userId);
      else                  await cancelCheckIn(eventId, userId);
    });
  }

  // Groupes qui ont des membres
  const activeGroups = ALL_GROUPS.filter(g => members.some(m => m.groups.includes(g)));
  const noGroupMembers = members.filter(m => m.groups.length === 0);

  function formatDate(date: string) {
    const d = new Date(date + "T00:00:00");
    return {
      short: d.toLocaleDateString("fr-CH", { day: "numeric", month: "short" }),
      day:   d.toLocaleDateString("fr-CH", { weekday: "short" }),
    };
  }

  function getRate(eventId: string, groupMembers: MemberRow[]) {
    if (groupMembers.length === 0) return null;
    const present = groupMembers.filter(m => localAttend[eventId]?.has(m.id)).length;
    return { present, total: groupMembers.length, pct: Math.round(present / groupMembers.length * 100) };
  }

  function rateClass(pct: number) {
    return pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-500";
  }

  // ─── Modal Déclarer présence ───
  const DeclModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeclModal(false)} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <button onClick={() => setDeclModal(false)} className="absolute top-4 right-4 w-7 h-7 rounded-full border border-arc-border text-arc-text3 hover:text-arc-navy text-sm flex items-center justify-center">✕</button>
        <h2 className="font-bold text-arc-navy text-lg mb-4">✓ Déclarer ma présence</h2>
        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs font-bold text-arc-text3 mb-1 block">Événement</label>
            <select
              value={declEventId}
              onChange={e => setDeclEventId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-arc-border text-sm outline-none focus:border-arc-navy bg-white"
            >
              {pastEvents.map(e => (
                <option key={e.id} value={e.id}>
                  {e.title} — {formatDate(e.date).short}
                  {myChecked.has(e.id) ? " (déjà enregistré)" : ""}
                </option>
              ))}
            </select>
          </div>
          {declEventId && myChecked.has(declEventId) && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-sm text-green-700 font-semibold">
              ✓ Ta présence est déjà enregistrée pour cet événement.
            </div>
          )}
        </div>
        <button
          onClick={() => {
            if (declEventId && !myChecked.has(declEventId)) {
              toggleMyCheckIn(declEventId);
            }
            setDeclModal(false);
          }}
          disabled={!declEventId || myChecked.has(declEventId)}
          className="w-full py-3 rounded-xl bg-arc-navy text-white font-bold text-sm hover:bg-arc-navy2 transition-colors disabled:opacity-50"
        >
          Enregistrer ma présence
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {declModal && <DeclModal />}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <button
          onClick={() => setDeclModal(true)}
          className="px-4 py-2 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors flex items-center gap-1.5"
        >
          + Déclarer ma présence
        </button>

        <div className="flex bg-white border border-arc-border rounded-xl overflow-hidden ml-auto">
          <button onClick={() => setGroupView(true)}
            className={`px-3 py-2 text-xs font-semibold transition-colors ${groupView ? "bg-arc-navy text-white" : "text-arc-text2 hover:bg-arc-bg"}`}>
            Par groupe
          </button>
          <button onClick={() => setGroupView(false)}
            className={`px-3 py-2 text-xs font-semibold transition-colors ${!groupView ? "bg-arc-navy text-white" : "text-arc-text2 hover:bg-arc-bg"}`}>
            Liste
          </button>
        </div>

        {/* Navigation dates */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(offset + pageSize)}
            disabled={offset + pageSize >= totalEvents}
            className="w-8 h-8 rounded-lg border border-arc-border text-arc-text2 hover:border-arc-navy disabled:opacity-30 text-sm flex items-center justify-center"
          >‹</button>
          <span className="text-xs text-arc-text3 px-1">
            {offset + 1}–{Math.min(offset + pageSize, totalEvents)} / {totalEvents}
          </span>
          <button
            onClick={() => navigate(Math.max(0, offset - pageSize))}
            disabled={offset === 0}
            className="w-8 h-8 rounded-lg border border-arc-border text-arc-text2 hover:border-arc-navy disabled:opacity-30 text-sm flex items-center justify-center"
          >›</button>
        </div>
      </div>

      {events.length === 0 && (
        <div className="bg-white border border-arc-border rounded-2xl py-10 text-center text-arc-text3 text-sm">
          Aucun événement passé.
        </div>
      )}

      {events.length > 0 && (
        <div className="bg-white border border-arc-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 600 }}>
              <thead>
                <tr className="border-b border-arc-border bg-arc-bg">
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-arc-text3 uppercase tracking-wider" style={{ minWidth: 160 }}>
                    Groupe / Nom
                  </th>
                  {events.map(ev => {
                    const { short, day } = formatDate(ev.date);
                    const isToday = ev.date === today;
                    return (
                      <th key={ev.id} className="px-3 py-3 text-center" style={{ minWidth: 110 }}>
                        <Link href={`/espace-membres/presences/${ev.id}`} className="group block">
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? "text-arc-blue" : "text-arc-text3"}`}>{day}</div>
                          <div className={`text-xs font-bold mt-0.5 group-hover:text-arc-blue transition-colors ${isToday ? "text-arc-blue" : "text-arc-navy"}`}>{short}</div>
                          <div className="text-[9px] text-arc-text3 mt-0.5 truncate max-w-[90px] mx-auto">{ev.title}</div>
                        </Link>
                      </th>
                    );
                  })}
                  <th className="px-3 py-3 text-center text-[11px] font-bold text-arc-text3 uppercase tracking-wider">
                    Taux moy.
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupView ? (
                  <>
                    {activeGroups.map((groupName, gi) => {
                      const gDef = getGroup(groupName);
                      const Icon = gDef.Icon;
                      const groupMembers = members.filter(m => m.groups.includes(groupName));
                      const overallRate = events.length > 0
                        ? Math.round(events.reduce((s, e) => s + (getRate(e.id, groupMembers)?.pct ?? 0), 0) / events.length) : 0;

                      return (
                        <tr key={groupName} className={gi % 2 === 0 ? "bg-white" : "bg-arc-bg/50"}>
                          {/* Colonne groupe */}
                          <td className="px-4 py-2.5 border-b border-arc-border/50">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border ${gDef.bg} ${gDef.border}`}>
                                <Icon size={12} strokeWidth={2} className={gDef.color} />
                              </span>
                              <span className="text-xs font-bold text-arc-navy">{groupName}</span>
                              <span className="text-[10px] text-arc-text3 ml-1">({groupMembers.length})</span>
                            </div>
                          </td>

                          {/* Colonnes événements */}
                          {events.map(ev => {
                            const rate = getRate(ev.id, groupMembers);
                            const presentInGroup = groupMembers.filter(m => localAttend[ev.id]?.has(m.id));
                            const absentInGroup  = groupMembers.filter(m => !localAttend[ev.id]?.has(m.id));
                            const isMyEvent      = myChecked.has(ev.id) && groupMembers.some(m => m.id === currentUserId);

                            return (
                              <td key={ev.id} className="px-2 py-2 border-b border-arc-border/50 border-l border-arc-border/30 text-center align-top">
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {presentInGroup.slice(0, 3).map(m => {
                                    const name = `${m.first_name?.[0] ?? ""}. ${m.last_name ?? ""}`.trim();
                                    const isMe = m.id === currentUserId;
                                    return (
                                      <button
                                        key={m.id}
                                        onClick={() => isAdmin ? toggleAdminCheckIn(ev.id, m.id) : undefined}
                                        title={isAdmin ? `Clic pour retirer la présence de ${m.first_name} ${m.last_name}` : undefined}
                                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border transition-colors ${
                                          isAdmin ? "cursor-pointer" : "cursor-default"
                                        } ${isMe ? "bg-arc-blue text-white border-arc-blue" : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"}`}
                                      >
                                        {name} ✓
                                      </button>
                                    );
                                  })}
                                  {presentInGroup.length > 3 && (
                                    <Link href={`/espace-membres/presences/${ev.id}`}
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                                      +{presentInGroup.length - 3}
                                    </Link>
                                  )}
                                  {absentInGroup.slice(0, 2).map(m => {
                                    const name = `${m.first_name?.[0] ?? ""}. ${m.last_name ?? ""}`.trim();
                                    return (
                                      <button
                                        key={m.id}
                                        onClick={() => isAdmin ? toggleAdminCheckIn(ev.id, m.id) : undefined}
                                        title={isAdmin ? `Clic pour marquer présent : ${m.first_name} ${m.last_name}` : undefined}
                                        className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-colors ${
                                          isAdmin ? "cursor-pointer hover:bg-green-50 hover:text-green-700 hover:border-green-200" : "cursor-default"
                                        } text-arc-text3 border-arc-border/50`}
                                      >
                                        {name}
                                      </button>
                                    );
                                  })}
                                  {absentInGroup.length > 2 && (
                                    <Link href={`/espace-membres/presences/${ev.id}`}
                                      className="text-[9px] text-arc-text3 px-1.5 py-0.5">
                                      …{absentInGroup.length - 2} abs.
                                    </Link>
                                  )}
                                  {isAdmin && groupMembers.length > 0 && (
                                    <Link href={`/espace-membres/presences/${ev.id}`}
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-arc-blue border border-arc-blue/30 hover:bg-arc-blue/5">
                                      +
                                    </Link>
                                  )}
                                </div>
                                {rate && (
                                  <div className={`text-[9px] font-bold mt-1 ${rateClass(rate.pct)}`}>
                                    {rate.present}/{rate.total}
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          {/* Taux moyen */}
                          <td className="px-3 py-2.5 border-b border-arc-border/50 border-l border-arc-border/30 text-center">
                            <span className={`text-sm font-bold ${rateClass(overallRate)}`}>{overallRate}%</span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Sans groupe */}
                    {noGroupMembers.length > 0 && (() => {
                      const overallRate = events.length > 0
                        ? Math.round(events.reduce((s, e) => s + (getRate(e.id, noGroupMembers)?.pct ?? 0), 0) / events.length) : 0;
                      return (
                        <tr className="bg-arc-bg/30">
                          <td className="px-4 py-2.5 border-b border-arc-border/50">
                            <div className="text-xs font-bold text-arc-text2">Membres sans groupe ({noGroupMembers.length})</div>
                          </td>
                          {events.map(ev => {
                            const rate = getRate(ev.id, noGroupMembers);
                            const present = noGroupMembers.filter(m => localAttend[ev.id]?.has(m.id)).length;
                            return (
                              <td key={ev.id} className="px-2 py-2.5 border-b border-arc-border/50 border-l border-arc-border/30 text-center">
                                <Link href={`/espace-membres/presences/${ev.id}`}
                                  className={`text-xs font-semibold hover:underline ${rate && rate.pct >= 60 ? "text-green-600" : "text-arc-text2"}`}>
                                  {present} présents
                                </Link>
                              </td>
                            );
                          })}
                          <td className="px-3 py-2.5 border-b border-arc-border/50 border-l border-arc-border/30 text-center">
                            <span className={`text-sm font-bold ${rateClass(overallRate)}`}>{overallRate}%</span>
                          </td>
                        </tr>
                      );
                    })()}
                  </>
                ) : (
                  // Vue liste plate
                  members.slice(0, 50).map((m, mi) => {
                    const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre";
                    const isMe = m.id === currentUserId;
                    const presentCount = events.filter(e => localAttend[e.id]?.has(m.id)).length;
                    const rate = events.length > 0 ? Math.round(presentCount / events.length * 100) : 0;
                    return (
                      <tr key={m.id} className={mi % 2 === 0 ? "bg-white" : "bg-arc-bg/50"}>
                        <td className="px-4 py-2.5 border-b border-arc-border/50">
                          <span className={`text-xs font-semibold ${isMe ? "text-arc-blue" : "text-arc-navy"}`}>
                            {name}{isMe ? " (moi)" : ""}
                          </span>
                        </td>
                        {events.map(ev => {
                          const present = localAttend[ev.id]?.has(m.id);
                          return (
                            <td key={ev.id} className="px-2 py-2.5 border-b border-arc-border/50 border-l border-arc-border/30 text-center">
                              <button
                                onClick={() => {
                                  if (isMe) toggleMyCheckIn(ev.id);
                                  else if (isAdmin) toggleAdminCheckIn(ev.id, m.id);
                                }}
                                className={`text-xs font-bold transition-colors ${
                                  present ? "text-green-600 hover:text-red-400" : "text-arc-text3 hover:text-green-600"
                                } ${(!isMe && !isAdmin) ? "cursor-default" : "cursor-pointer"}`}
                              >
                                {present ? "✓" : "—"}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2.5 border-b border-arc-border/50 border-l border-arc-border/30 text-center">
                          <span className={`text-xs font-bold ${rateClass(rate)}`}>{rate}%</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-arc-text3">
          {Math.min(offset + pageSize, totalEvents)} événements sur {totalEvents} au total
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(offset + pageSize)}
            disabled={offset + pageSize >= totalEvents}
            className="px-3 py-1.5 text-xs rounded-lg border border-arc-border text-arc-text2 hover:border-arc-navy disabled:opacity-30 transition-colors"
          >
            ← Événements précédents
          </button>
          <button
            onClick={() => navigate(Math.max(0, offset - pageSize))}
            disabled={offset === 0}
            className="px-3 py-1.5 text-xs rounded-lg border border-arc-border text-arc-text2 hover:border-arc-navy disabled:opacity-30 transition-colors"
          >
            Événements récents →
          </button>
        </div>
      </div>
    </div>
  );
}
