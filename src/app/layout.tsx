import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { SITE_BASE } from "@/lib/url";
import { createClient } from "@/lib/supabase/server";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_BASE),
  title: "ARC — Ambassade du Royaume de Christ · La Chaux-de-Fonds",
  description:
    "Une communauté évangélique vivante, fondée sur la Parole de Dieu, ouverte à toutes les nations. La Chaux-de-Fonds, Suisse.",
  keywords: [
    "église",
    "évangélique",
    "La Chaux-de-Fonds",
    "Suisse",
    "ARC",
    "Ambassade du Royaume de Christ",
  ],
  authors: [{ name: "ARC Église" }],
  applicationName: "ARC Église",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/images/logo-arc.jpeg", type: "image/jpeg" },
    ],
    apple: [
      { url: "/images/logo-arc.jpeg", type: "image/jpeg" },
    ],
    shortcut: "/images/logo-arc.jpeg",
  },
  openGraph: {
    title: "ARC — Ambassade du Royaume de Christ",
    description: "Église évangélique à La Chaux-de-Fonds, Suisse",
    locale: "fr_CH",
    type: "website",
    siteName: "ARC Église",
    images: [{ url: "/images/logo-arc.jpeg", width: 1200, height: 630, alt: "ARC Église" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ARC — Ambassade du Royaume de Christ",
    description: "Église évangélique à La Chaux-de-Fonds, Suisse",
    images: ["/images/logo-arc.jpeg"],
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  other: {
    "msapplication-TileColor": "#1e2464",
    "msapplication-TileImage": "/images/logo-arc.jpeg",
    "msapplication-config": "/browserconfig.xml",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e2464",
  width: "device-width",
  initialScale: 1,
};

function buildThemeCss(color: string): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!m) return "";
  const darken = (factor: number) => {
    const [r, g, b] = [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)];
    return `#${[r, g, b].map(c => Math.max(0, Math.round(c * factor)).toString(16).padStart(2, "0")).join("")}`;
  };
  const n2 = darken(0.85);
  const n3 = darken(0.70);
  return `
.bg-arc-navy,.hover\\:bg-arc-navy:hover{background-color:${color}!important}
.bg-arc-navy2,.hover\\:bg-arc-navy2:hover{background-color:${n2}!important}
.bg-arc-navy3{background-color:${n3}!important}
.bg-arc-navy9{background-color:${n3}!important}
.text-arc-navy{color:${color}!important}
.border-arc-navy,.focus\\:border-arc-navy:focus,.hover\\:border-arc-navy:hover{border-color:${color}!important}
.from-arc-navy{--tw-gradient-from:${color}!important}
.via-arc-navy{--tw-gradient-via:${color}!important}
.to-arc-navy{--tw-gradient-to:${color}!important}
.to-arc-navy2{--tw-gradient-to:${n2}!important}
.to-arc-navy3{--tw-gradient-to:${n3}!important}
.ring-arc-navy{--tw-ring-color:${color}!important}
.accent-arc-navy{accent-color:${color}!important}
`;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let themeStyle: string | null = null;
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["theme_accent_color", "theme_accent_until"]);
    const map: Record<string, string> = {};
    for (const row of data ?? []) map[row.key] = row.value;
    const color = map["theme_accent_color"] ?? "";
    const until = map["theme_accent_until"] ?? "";
    const today = new Date().toISOString().split("T")[0]!;
    if (color && until && until >= today) {
      themeStyle = buildThemeCss(color);
    }
  } catch {
    // ignore — theme override is non-critical
  }

  return (
    <html lang="fr" className={`${cormorant.variable} ${manrope.variable}`}>
      <body className="font-sans antialiased">
        {themeStyle && <style dangerouslySetInnerHTML={{ __html: themeStyle }} />}
        {children}
      </body>
    </html>
  );
}
