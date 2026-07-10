"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  blockMember,
  unblockMember,
  deleteMember,
  sendPasswordResetToMember,
} from "@/lib/actions/crm";

interface Props {
  memberId:   string;
  memberName: string;
  isBanned:   boolean;
  isAdmin:    boolean;
}

export function DangerActionsPanel({ memberId, memberName, isBanned, isAdmin }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg,           setMsg]           = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function flash(ok: boolean, text: string) {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 6000);
  }

  function act(
    fn: () => Promise<{ error?: string; success?: boolean }>,
    successMsg: string,
    afterSuccess?: () => void,
  ) {
    startTransition(async () => {
      const res = await fn();
      if (res.error) {
        flash(false, res.error);
      } else {
        flash(true, successMsg);
        if (afterSuccess) {
          afterSuccess();
        } else {
          router.refresh();
        }
      }
    });
  }

  return (
    <div className="bg-white border border-arc-border rounded-2xl p-5">
      <h3 className="font-bold text-arc-navy text-sm mb-4">Actions administratives</h3>

      {msg && (
        <div className={`rounded-xl px-4 py-3 mb-4 text-sm ${
          msg.ok
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-arc-red"
        }`}>
          {msg.ok ? "✅ " : "⚠️ "}{msg.text}
        </div>
      )}

      <div className="space-y-3">

        {/* ── Réinitialiser le mot de passe ─────────────────────────── */}
        <div className="flex items-center justify-between border border-arc-border rounded-xl px-4 py-3 gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-arc-navy">Réinitialiser le mot de passe</div>
            <div className="text-xs text-arc-text3 truncate">Envoie un email de reset à {memberName}</div>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              act(
                () => sendPasswordResetToMember(memberId),
                "Email de réinitialisation envoyé.",
              )
            }
            className="flex-shrink-0 px-3 py-2 rounded-lg bg-arc-blueBg text-arc-navy
                       text-xs font-bold border border-arc-border hover:bg-arc-bg
                       disabled:opacity-50 transition-colors"
          >
            📧 Envoyer
          </button>
        </div>

        {/* ── Bloquer / Débloquer ────────────────────────────────────── */}
        <div className="flex items-center justify-between border border-arc-border rounded-xl px-4 py-3 gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-arc-navy">
              {isBanned ? "Débloquer le compte" : "Bloquer le compte"}
            </div>
            <div className="text-xs text-arc-text3">
              {isBanned
                ? "Compte actuellement bloqué — connexion impossible."
                : "Empêche la connexion sans supprimer les données."}
            </div>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              act(
                isBanned ? () => unblockMember(memberId) : () => blockMember(memberId),
                isBanned ? "Compte débloqué." : "Compte bloqué.",
              )
            }
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold border
                        transition-colors disabled:opacity-50 ${
              isBanned
                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
            }`}
          >
            {isBanned ? "🔓 Débloquer" : "🚫 Bloquer"}
          </button>
        </div>

        {/* ── Supprimer (admin uniquement) ───────────────────────────── */}
        {isAdmin && (
          <div className="border border-red-200 rounded-xl px-4 py-3 bg-red-50 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-arc-red">Supprimer le compte</div>
                <div className="text-xs text-red-400">
                  Action irréversible — toutes les données seront perdues.
                </div>
              </div>
              {!confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex-shrink-0 px-3 py-2 rounded-lg bg-red-100 text-arc-red
                             text-xs font-bold border border-red-200 hover:bg-red-200 transition-colors"
                >
                  🗑️ Supprimer
                </button>
              )}
            </div>

            {confirmDelete && (
              <div className="bg-white border border-red-200 rounded-lg p-3 space-y-2">
                <p className="text-xs text-red-700 font-medium">
                  ⚠️ Tu vas supprimer définitivement le compte de{" "}
                  <strong>{memberName}</strong>. Cette action est irréversible.
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-arc-border
                               text-arc-text2 bg-white hover:bg-arc-bg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setConfirmDelete(false);
                      act(
                        () => deleteMember(memberId),
                        "Compte supprimé.",
                        () => router.push("/admin/crm"),
                      );
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white
                               bg-arc-red hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    Confirmer la suppression
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
