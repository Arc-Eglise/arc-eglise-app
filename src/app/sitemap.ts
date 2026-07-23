import { MetadataRoute } from "next";
import { SITE_BASE as base } from "@/lib/url";

// Site vitrine = page unique à ancres. Les URLs à fragment (#sermons,
// #sermon-<id>, …) sont ignorées par Google (le fragment est retiré → doublon
// de l'accueil), on ne liste donc que les vraies routes crawlables.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base,                lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/inscription`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/connexion`,   lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];
}
