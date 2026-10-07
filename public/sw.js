// Offline-tuki. Sivu haetaan verkosta aina kun mahdollista (päivitykset tulevat heti),
// muuten välimuistista. Muut tiedostot (JS, CSS, ikonit) välimuistista ja päivitetään taustalla.
const CACHE = 'treenit-v1';

// Asennuksessa haetaan sivu ja sen JS/CSS heti talteen, jotta appi toimii offline jo ensimmäisen avauksen jälkeen.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const c = await caches.open(CACHE);
      const html = await (await fetch('./', { cache: 'no-cache' })).text();
      const assets = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)].map((m) => './' + m[1]);
      await c.addAll(['./', './manifest.webmanifest', './apple-touch-icon.png', './icon.svg', ...assets]);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async (c) => {
      const cached = await c.match(req);
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) c.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached ?? fresh;
    }),
  );
});
