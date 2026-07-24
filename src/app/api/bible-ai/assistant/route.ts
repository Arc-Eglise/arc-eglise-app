import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { arcAIRequest } from "@/lib/bible-ai";

// Assistant pastoral capable d'AGIR (tool-calling) au nom du membre connecté.
// Non-stream : ce chemin transmet userId → runArcAgent expose les tools
// create_prayer_request / create_event (avec garde-fous côté agent).
const ASSISTANT_PROMPT =
  "Tu es l'assistant pastoral de l'église ARC (Ambassade du Royaume de Christ), à La Chaux-de-Fonds. " +
  "Tu réponds en français, avec chaleur et fidélité aux valeurs chrétiennes évangéliques. " +
  "Tu peux AGIR pour l'utilisateur via tes outils : créer une demande de prière (create_prayer_request), " +
  "ou — s'il en a le droit (pasteur/admin/communication) — créer un événement d'église (create_event). " +
  "Avant toute création, confirme les informations clés (titre, date, lieu) puis exécute l'outil. " +
  "Après une action, confirme brièvement et clairement ce qui a été fait.";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { message, history = [] } = body as {
    message?: string;
    history?: { role: string; content: string }[];
  };
  if (!message?.trim()) return NextResponse.json({ error: "Message requis" }, { status: 400 });

  const answer = await arcAIRequest(message.trim(), ASSISTANT_PROMPT, history, user.id)
    .catch(() => "Assistant temporairement indisponible. Merci de réessayer dans un instant.");

  return NextResponse.json({ answer });
}
