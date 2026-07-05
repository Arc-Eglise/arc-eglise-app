import { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.arc-eglise.ch").replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,             lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/#sermons`,      lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/#evenements`,   lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/#temoignages`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/#equipe`,       lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/#contact`,      lastModified: new Date(), changeFrequency: "yearly",  priority: 0.5 },
    { url: `${base}/connexion`,     lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/inscription`,   lastModified: new Date(), changeFrequency: "yearly",  priority: 0.4 },
  ];

  try {
    const supabase = createClient();

    const { data: sermons } = await supabase
      .from("sermons")
      .select("id, updated_at")
      .eq("is_published", true)
      .order("date", { ascending: false })
      .limit(50);

    const { data: events } = await supabase
      .from("events")
      .select("id, updated_at")
      .eq("is_published", true)
      .gte("date", new Date().toISOString().split("T")[0])
      .limit(30);

    const sermonRoutes: MetadataRoute.Sitemap = (sermons ?? []).map((s) => ({
      url: `${base}/#sermon-${s.id}`,
      lastModified: new Date(s.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    const eventRoutes: MetadataRoute.Sitemap = (events ?? []).map((e) => ({
      url: `${base}/#event-${e.id}`,
      lastModified: new Date(e.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    return [...staticRoutes, ...sermonRoutes, ...eventRoutes];
  } catch {
    return staticRoutes;
  }
}
