import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ARC — Ambassade du Royaume de Christ · La Chaux-de-Fonds",
  description:
    "Une communauté évangélique vivante, fondée sur la Parole de Dieu, ouverte à toutes les nations. La Chaux-de-Fonds, Suisse.",
  keywords: ["église", "évangélique", "La Chaux-de-Fonds", "Suisse", "ARC", "Ambassade du Royaume de Christ"],
  authors: [{ name: "ARC Église" }],
  openGraph: {
    title: "ARC — Ambassade du Royaume de Christ",
    description: "Église évangélique à La Chaux-de-Fonds, Suisse",
    locale: "fr_CH",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e2464",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
