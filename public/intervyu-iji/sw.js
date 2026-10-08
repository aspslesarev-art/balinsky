// Офлайн для шпаргалки /intervyu-iji: страница и шрифты кешируются при первом заходе,
// дальше открываются без сети. Сеть в приоритете, кеш — когда её нет.
var CACHE = 'intervyu-iji-v2';
var PAGE = '/intervyu-iji';
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.add(PAGE).then(function () { return c.add('/intervyu-iji/icon.png').catch(function () {}); }); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('intervyu-iji-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var isPage = req.mode === 'navigate' && url.pathname.indexOf(PAGE) === 0;
  var isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!isPage && !isFont && url.pathname !== '/intervyu-iji/icon.png') return;
  var key = isPage ? PAGE : req;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(key, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(key).then(function (hit) { return hit || Response.error(); });
    })
  );
});
