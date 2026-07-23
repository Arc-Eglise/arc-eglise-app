/* Service Worker — ARC Église — Web Push
   Affiche les notifications push et gère le clic. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "ARC Église", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "ARC Église";
  const options = {
    body: data.body || "",
    icon: data.icon || "/images/logo-arc.jpeg",
    badge: data.badge || "/images/logo-arc.jpeg",
    lang: "fr",
    data: { url: data.link || data.url || "/espace-membres" },
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/espace-membres";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Onglet déjà sur la cible → focus
        for (const client of clientList) {
          if (client.url.includes(target) && "focus" in client) return client.focus();
        }
        // Sinon, réutiliser un onglet ouvert et naviguer
        for (const client of clientList) {
          if ("focus" in client) {
            if ("navigate" in client) client.navigate(target);
            return client.focus();
          }
        }
        // Aucun onglet → ouvrir
        if (self.clients.openWindow) return self.clients.openWindow(target);
      })
  );
});
