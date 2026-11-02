/* ИИ-Шпаргалка — service worker: офлайн-режим.
   Стратегия cache-first: файл отдаётся из кэша сразу, а в фоне (если есть интернет)
   кэш обновляется свежей версией — она появится при следующем открытии.
   Добавили новый файл на сайт — впишите его в FILES и увеличьте номер VERSION. */

var VERSION = 'v2';
var CACHE = 'iish-' + VERSION;

var FILES = [
  './',
  'index.html',
  'constructor.html',
  'prompts.html',
  'how.html',
  'docs.html',
  'safety.html',
  'about.html',
  'my.html',
  'css/style.css',
  'css/print.css',
  'js/data.js',
  'js/app.js',
  'js/constructor.js',
  'js/prompts.js',
  'js/my.js',
  'js/qr.js',
  'assets/favicon.svg',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/og-image.png',
  'manifest.webmanifest'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(FILES);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key.indexOf('iish-') === 0 && key !== CACHE) return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // чужие сайты не трогаем

  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      // ignoreSearch: constructor.html?id=… берётся из кэша constructor.html
      return cache.match(req, { ignoreSearch: true }).then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.ok && res.type === 'basic') cache.put(url.search ? url.pathname : req, res.clone());
          return res;
        }).catch(function () {
          return null;
        });

        if (cached) {
          event.waitUntil(network);
          return cached;
        }
        return network.then(function (res) {
          if (res) return res;
          if (req.mode === 'navigate') return cache.match('index.html');
          return new Response('', { status: 504, statusText: 'Нет соединения' });
        });
      });
    })
  );
});
