import { createAdminClient } from "@/lib/supabase/admin";
import { sendContactNotification, sendContactConfirmation } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { first_name, last_name, email, subject, message } = body;

  if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });
  }

  if (message.trim().length > 5000) {
    return NextResponse.json({ error: "Message trop long (max 5000 caractères)" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error: dbError } = await supabase.from("contact_messages").insert({
    first_name: first_name.trim(),
    last_name:  last_name.trim(),
    email:      email.trim().toLowerCase(),
    subject:    subject?.trim() || "Information générale",
    message:    message.trim(),
  });

  if (dbError) {
    console.error("[api/contact] Supabase error:", dbError.message);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 });
  }

  const formData = {
    first_name: first_name.trim(),
    last_name:  last_name.trim(),
    email:      email.trim().toLowerCase(),
    subject:    subject?.trim() || "Information générale",
    message:    message.trim(),
  };

  await Promise.allSettled([
    sendContactNotification(formData),
    sendContactConfirmation({ first_name: formData.first_name, email: formData.email }),
  ]);

  return NextResponse.json({ success: true });
}
