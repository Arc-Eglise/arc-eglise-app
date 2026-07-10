import { createClient } from "@/lib/supabase/server";
import { NextResponse }  from "next/server";
import { SITE_BASE }     from "@/lib/url";

export async function GET() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", SITE_BASE));
}
