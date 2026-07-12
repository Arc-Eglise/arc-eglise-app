"use client";

import { useFormState, useFormStatus } from "react-dom";

type State = { error?: string; success?: boolean } | null;

const ROLES_ALL     = ["admin", "pasteur", "membre", "visiteur"] as const;
const ROLES_PASTEUR = ["membre", "visiteur"] as const;

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors flex-shrink-0 disabled:opacity-60"
    >
      {pending ? "…" : "OK"}
    </button>
  );
}

export function RoleSelectorClient({
  action,
  currentRole,
  callerIsAdmin,
}: {
  action: (prevState: State, formData: FormData) => Promise<State>;
  currentRole: string;
  callerIsAdmin: boolean;
}) {
  const [state, formAction] = useFormState(action, null);

  return (
    <div>
      <form action={formAction} className="flex gap-2">
        <select
          name="role"
          defaultValue={currentRole}
          className="flex-1 px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy bg-white"
        >
          {(callerIsAdmin ? ROLES_ALL : ROLES_PASTEUR).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <SubmitBtn />
      </form>
      {state?.success && (
        <p className="text-[11px] text-green-600 font-semibold mt-1.5">✓ Rôle mis à jour</p>
      )}
      {state?.error && (
        <p className="text-[11px] text-red-500 mt-1.5">{state.error}</p>
      )}
      {!callerIsAdmin && (
        <p className="text-[11px] text-arc-text3 mt-1.5">Seul l&apos;admin peut attribuer pasteur / admin.</p>
      )}
    </div>
  );
}
