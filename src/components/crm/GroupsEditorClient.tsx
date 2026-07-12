"use client";

import { useFormState, useFormStatus } from "react-dom";

type State = { error?: string; success?: boolean } | null;

const ALL_GROUPS = ["pasteur","chorale","media","social","sanitaire","finance","support","jeunesse","femmes","ecodim","suivi","communication"];

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-5 py-2 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors disabled:opacity-60"
    >
      {pending ? "Enregistrement…" : "Enregistrer les fonctions"}
    </button>
  );
}

export function GroupsEditorClient({
  action,
  currentGroups,
}: {
  action: (prevState: State, formData: FormData) => Promise<State>;
  currentGroups: string[];
}) {
  const [state, formAction] = useFormState(action, null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {ALL_GROUPS.map((g) => (
          <label key={g} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-arc-bg transition-colors">
            <input
              type="checkbox"
              name={g}
              defaultChecked={currentGroups.includes(g)}
              className="accent-arc-navy"
            />
            <span className="text-sm text-arc-navy capitalize">{g}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <SubmitBtn />
        {state?.success && (
          <span className="text-[11px] text-green-600 font-semibold">✓ Fonctions enregistrées</span>
        )}
        {state?.error && (
          <span className="text-[11px] text-red-500">{state.error}</span>
        )}
      </div>
    </form>
  );
}
