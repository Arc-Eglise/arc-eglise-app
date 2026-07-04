import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ARC Église",
    short_name: "ARC",
    description: "Site officiel de l'église ARC à La Chaux-de-Fonds",
    start_url: "/",
    display: "standalone",
    background_color: "#0f123a",
    theme_color: "#1e2464",
    orientation: "any",
    categories: ["religion", "community", "lifestyle"],
    icons: [
      {
        src: "/images/logo-arc.jpeg",
        sizes: "any",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
