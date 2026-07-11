import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { SITE_BASE } from "@/lib/url";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${manrope.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
