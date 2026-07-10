import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const CANONICAL = "arc-eglise.ch";

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0];

  // ── Redirect any non-canonical domain → arc-eglise.ch (301) ─────────────
  // Couvre : *.vercel.app, www.arc-eglise.ch, et tout autre alias futur.
  // Exceptions : localhost et *.localhost pour le développement local.
  const isLocal = host === "localhost" || host.endsWith(".localhost");
  const isCanonical = host === CANONICAL;

  if (!isLocal && !isCanonical) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL;
    return NextResponse.redirect(url, { status: 301 });
  }

  // ── Session Supabase (rafraîchissement des cookies) ──────────────────────
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
