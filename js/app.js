/* ИИ-Шпаргалка — общий код для всех страниц:
   тема, меню, иконки, тосты, копирование, избранное, «Мои промпты», QR-окно, офлайн-режим. */
(function () {
  'use strict';

  var App = window.App = {};
  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  /* ---------- Хранилище (только localStorage этого браузера) ---------- */

  var PREFIX = 'iish:';
  App.store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },
    remove: function (key) {
      try { localStorage.removeItem(PREFIX + key); } catch (e) { /* ничего */ }
    }
  };

  /* ---------- Мелкие помощники ---------- */

  App.escape = function (str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  App.icon = function (name, extraClass) {
    return '<svg class="ico' + (extraClass ? ' ' + extraClass : '') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>';
  };

  App.plural = function (n, one, few, many) {
    var n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
    return many;
  };

  App.formatDate = function (ts) {
    try {
      return new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  App.qs = function (name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  };

  App.isTodo = function (value) {
    return !value || /^TODO/i.test(String(value));
  };

  App.ai = function (id) {
    var list = (window.LINKS && window.LINKS.ai) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  };

  /* ---------- Иконки (свой SVG-спрайт, без внешних наборов) ---------- */

  var ICONS = {
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
    qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 20h2M20 14v2"/>',
    print: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="2"/><rect x="7" y="14" width="10" height="6" rx="1"/>',
    save: '<path d="M6 4h12v16l-6-4-6 4z"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M2.5 12h2M19.5 12h2M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4v4h4"/>',
    wand: '<path d="M4 20L15 9"/><path d="M14 3.5l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/><path d="M19 12l.7 1.3 1.3.7-1.3.7L19 16l-.7-1.3-1.3-.7 1.3-.7z"/>',
    cards: '<rect x="3" y="6" width="13" height="14" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v12"/>',
    book: '<path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5z"/><path d="M12 6v14"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18 16l.6 1.4L20 18l-1.4.6L18 20l-.6-1.4L16 18l1.4-.6z"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".5"/>',
    folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    // Жанры
    mask: '<path d="M4 6c3 1.5 13 1.5 16 0v5c0 5-3.5 8-8 8s-8-3-8-8z"/><path d="M8.5 11.5c.7-.6 1.8-.6 2.5 0M13 11.5c.7-.6 1.8-.6 2.5 0M9.5 15.5c1.5 1 3.5 1 5 0"/>',
    coins: '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6"/><path d="M5 10v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4"/><path d="M5 14v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-4 6-6.5 10-8.5"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7.5 14h9"/>',
    scales: '<path d="M12 4v16M7 20h10M5 7h14"/><path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/>',
    news: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M7 9h7M7 12.5h7M7 16h4"/>'
  };

  /* ---------- Жанры: иконка и цвет значка ---------- */

  var GENRES = {
    'Детектив': ['search', '#8ec9f5'],
    'Ролевая игра': ['mask', '#ffc2d1'],
    'Экономическая симуляция': ['coins', '#ffd93d'],
    'Эко-триллер': ['leaf', '#c6ef6b'],
    'Станционная игра': ['flag', '#ff8a65'],
    'Квиз-баттл': ['bolt', '#ffb84d'],
    'Расследование': ['flask', '#9fe0c4'],
    'Суд над историческим явлением': ['scales', '#e8d9b8'],
    'Редакция газеты': ['news', '#d9eefc'],
    'Правка ответа ИИ': ['wand', '#e7e2d6']
  };

  App.genreBadge = function (genre) {
    var g = GENRES[genre] || ['spark', '#c6ef6b'];
    return '<span class="genre-badge" style="--tint:' + g[1] + '" aria-hidden="true">' + App.icon(g[0]) + '</span>';
  };

  /* ---------- Иллюстрации-стикеры (свои, inline SVG) ----------
     Цвета задаются классами .fp/.fy/.fc… в style.css, поэтому работают обе темы. */

  var ART = {
    hero:
      '<svg viewBox="0 0 520 470" class="art" aria-hidden="true" focusable="false">' +
      '<path class="fb1" d="M70 120C92 42 222 8 322 38s202 62 180 172-62 214-202 232S18 386 30 274 48 200 70 120z"/>' +
      '<circle class="fb2" cx="438" cy="96" r="58"/>' +
      // карта квеста
      '<g transform="rotate(7 380 330)">' +
        '<rect class="fi" x="280" y="258" width="214" height="158" rx="22"/>' +
        '<rect class="fs k" x="272" y="250" width="214" height="158" rx="22"/>' +
        '<path class="nf k dash" d="M302 378c30-42 62 12 92-30s48-30 66-58"/>' +
        '<circle class="fp k" cx="302" cy="378" r="9"/>' +
        '<path class="nf k" d="M392 326l14 14M406 326l-14 14"/>' +
        '<path class="nf k" d="M458 296v-62"/><path class="fc k" d="M458 234h28l-8 11 8 11h-28"/>' +
      '</g>' +
      // окно с промптом
      '<g transform="rotate(-3 220 190)">' +
        '<rect class="fi" x="68" y="88" width="320" height="230" rx="24"/>' +
        '<rect class="fp k" x="58" y="78" width="320" height="230" rx="24"/>' +
        '<path class="nf k" d="M58 124h320"/>' +
        '<circle class="fc k2" cx="86" cy="101" r="7"/><circle class="fy k2" cx="110" cy="101" r="7"/><circle class="fg k2" cx="134" cy="101" r="7"/>' +
        '<rect class="fln" x="84" y="150" width="190" height="12" rx="6"/>' +
        '<rect class="fln" x="84" y="176" width="246" height="12" rx="6"/>' +
        '<rect class="fy k2" x="84" y="200" width="160" height="28" rx="9"/><rect class="fi" x="98" y="211" width="96" height="6" rx="3"/>' +
        '<rect class="fln" x="84" y="242" width="214" height="12" rx="6"/>' +
        '<rect class="fln" x="84" y="266" width="120" height="12" rx="6"/>' +
        '<rect class="fg k2" x="262" y="258" width="92" height="34" rx="17"/><path class="nf" style="stroke:var(--art-paper);stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round" d="M296 275l7 7 14-14"/>' +
      '</g>' +
      // таймер «5 мин»
      '<g class="wobble"><circle class="fi" cx="66" cy="82" r="40"/><circle class="fc k" cx="60" cy="76" r="40"/>' +
      '<text class="txt fi" x="60" y="72" text-anchor="middle" font-size="24">5</text><text class="txt fi" x="60" y="96" text-anchor="middle" font-size="16">мин</text></g>' +
      // звезда
      '<path class="fy k wobble" d="M446 44l12 30 30 12-30 12-12 30-12-30-30-12 30-12z"/>' +
      // молния
      '<g class="wobble"><circle class="fl k" cx="62" cy="372" r="40"/><path class="fp k" d="M68 344l-20 32h15l-5 24 20-32H64z"/></g>' +
      // карандаш
      '<g transform="rotate(-32 200 410)"><path class="fc k" d="M138 398h-12a4 4 0 0 0-4 4v16a4 4 0 0 0 4 4h12z"/><rect class="fy k" x="138" y="398" width="104" height="24"/><path class="fp k" d="M242 398l28 12-28 12z"/><path class="fi" d="M262 406l8 4-8 4z"/></g>' +
      '<path class="fi" d="M238 26l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/>' +
      '<circle class="fc" cx="504" cy="232" r="6"/><circle class="fg" cx="18" cy="226" r="5"/><circle class="fy" cx="300" cy="448" r="6"/>' +
      '</svg>',

    constructor:
      '<svg viewBox="0 0 200 200" class="art" aria-hidden="true" focusable="false">' +
      '<circle class="fb1" cx="100" cy="104" r="88"/>' +
      '<g transform="rotate(-6 95 100)"><rect class="fi" x="47" y="57" width="110" height="100" rx="18"/><rect class="fp k" x="40" y="50" width="110" height="100" rx="18"/>' +
      '<path class="nf k" d="M60 80h70M60 102h70M60 124h70"/>' +
      '<circle class="fy k" cx="84" cy="80" r="9"/><circle class="fs k" cx="114" cy="102" r="9"/><circle class="fc k" cx="72" cy="124" r="9"/></g>' +
      '<path class="fi" d="M124 176l7 6 42-48-7-6z"/>' +
      '<path class="fy k wobble" d="M172 100l6 14 14 6-14 6-6 14-6-14-14-6 14-6z"/>' +
      '<circle class="fg" cx="30" cy="40" r="6"/>' +
      '</svg>',

    prompts:
      '<svg viewBox="0 0 200 200" class="art" aria-hidden="true" focusable="false">' +
      '<circle class="fb2" cx="100" cy="104" r="88"/>' +
      '<rect class="fc k" x="50" y="44" width="96" height="120" rx="16" transform="rotate(-13 98 104)"/>' +
      '<rect class="fs k" x="54" y="44" width="96" height="120" rx="16" transform="rotate(7 102 104)"/>' +
      '<g transform="rotate(-2 100 108)"><rect class="fp k" x="52" y="48" width="96" height="120" rx="16"/>' +
      '<rect class="fy" x="66" y="66" width="46" height="12" rx="6"/><rect class="fln" x="66" y="90" width="66" height="8" rx="4"/><rect class="fln" x="66" y="106" width="56" height="8" rx="4"/><rect class="fln" x="66" y="122" width="62" height="8" rx="4"/>' +
      '<circle class="fg k2" cx="128" cy="148" r="10"/></g>' +
      '<path class="fy k wobble" d="M164 30l5 12 12 5-12 5-5 12-5-12-12-5 12-5z"/>' +
      '</svg>',

    how:
      '<svg viewBox="0 0 200 200" class="art" aria-hidden="true" focusable="false">' +
      '<circle class="fb1" cx="100" cy="110" r="86"/>' +
      '<path class="fp k" d="M26 160c22-10 48-10 72 2V94c-24-12-50-12-72-2z"/>' +
      '<path class="fp k" d="M174 160c-22-10-48-10-76 2V94c28-12 54-12 76-2z"/>' +
      '<path class="nf sln" style="stroke-width:5;stroke-linecap:round" d="M42 112c14-5 28-5 42 1M42 130c14-5 28-5 42 1M114 113c14-6 30-6 46-1M114 131c14-6 30-6 46-1"/>' +
      '<g class="wobble"><path class="fy k" d="M100 14a25 25 0 0 0-15 45c3 2.5 5 6 5 10h20c0-4 2-7.5 5-10a25 25 0 0 0-15-45z"/><rect class="fs k" x="90" y="69" width="20" height="11" rx="3"/></g>' +
      '<path class="nf k" d="M58 30l10 8M142 30l-10 8M50 62h12M150 62h-12"/>' +
      '</svg>',

    safety:
      '<svg viewBox="0 0 200 200" class="art" aria-hidden="true" focusable="false">' +
      '<circle class="fb1" cx="100" cy="104" r="88"/>' +
      '<path class="fi" d="M107 31l52 18v38c0 34-22 58-52 68-30-10-52-34-52-68V49z"/>' +
      '<path class="fg k" d="M100 24l52 18v38c0 34-22 58-52 68-30-10-52-34-52-68V42z"/>' +
      '<path class="kp" d="M76 84l16 16 32-34"/>' +
      '<g class="wobble"><rect class="fy k" x="126" y="130" width="52" height="42" rx="10"/><path class="nf k" d="M139 130v-10a13 13 0 0 1 26 0v10"/><circle class="fi" cx="152" cy="150" r="5"/></g>' +
      '<circle class="fc" cx="32" cy="160" r="7"/>' +
      '</svg>',

    docs:
      '<svg viewBox="0 0 200 200" class="art" aria-hidden="true" focusable="false">' +
      '<circle class="fb2" cx="100" cy="104" r="88"/>' +
      '<path class="fc k" d="M28 72a10 10 0 0 1 10-10h34l12 14h78a10 10 0 0 1 10 10v70a10 10 0 0 1-10 10H38a10 10 0 0 1-10-10z"/>' +
      '<g transform="rotate(8 110 90)"><path class="fp k" d="M76 34h56l20 20v86H76z"/><path class="nf k" d="M132 34v20h20"/>' +
      '<rect class="fln" x="90" y="70" width="46" height="8" rx="4"/><rect class="fln" x="90" y="86" width="50" height="8" rx="4"/><rect class="fln" x="90" y="102" width="36" height="8" rx="4"/></g>' +
      '<path class="fs k" d="M28 104h144v52a10 10 0 0 1-10 10H38a10 10 0 0 1-10-10z"/>' +
      '<g class="wobble"><circle class="fy k" cx="152" cy="152" r="22"/><path class="nf k" d="M142 152l7 7 13-14"/></g>' +
      '</svg>',

    about:
      '<svg viewBox="0 0 200 200" class="art" aria-hidden="true" focusable="false">' +
      '<circle class="fb3" cx="100" cy="104" r="88"/>' +
      '<circle class="fp k" cx="92" cy="112" r="62"/><circle class="fc k" cx="92" cy="112" r="42"/><circle class="fp k" cx="92" cy="112" r="22"/><circle class="fi" cx="92" cy="112" r="7"/>' +
      '<path class="nf k" style="stroke-width:5" d="M94 110l66-66"/>' +
      '<path class="fy k wobble" d="M160 44l2-24 14 10 18 2-12 14z"/>' +
      '<path class="fy k" d="M30 40l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/>' +
      '</svg>',

    my:
      '<svg viewBox="0 0 200 200" class="art" aria-hidden="true" focusable="false">' +
      '<circle class="fb2" cx="100" cy="104" r="88"/>' +
      '<path class="fi" d="M68 38h76v130l-38-26-38 26z"/>' +
      '<path class="fg k" d="M60 30h76v130l-38-26-38 26z"/>' +
      '<path class="fy k wobble" d="M98 56l9 18 20 3-14 14 3 20-18-9-18 9 3-20-14-14 20-3z"/>' +
      '<g class="wobble"><circle class="fc k" cx="160" cy="62" r="17"/><path class="nf k" d="M160 54v16M152 62h16"/></g>' +
      '</svg>',

    cta:
      '<svg viewBox="0 0 220 220" class="art" aria-hidden="true" focusable="false">' +
      '<circle cx="130" cy="130" r="88" style="fill:#2a3a33"/>' +
      '<path class="fy" d="M110 30l18 44 44 18-44 18-18 44-18-44-44-18 44-18z"/>' +
      '<circle class="fl" cx="180" cy="60" r="14"/><circle class="fc" cx="60" cy="170" r="10"/>' +
      '</svg>'
  };

  function injectArt() {
    var els = document.querySelectorAll('[data-art]');
    for (var i = 0; i < els.length; i++) {
      var a = ART[els[i].getAttribute('data-art')];
      if (a) els[i].innerHTML = a;
    }
  }

  /* ---------- Полоса жанров на главной ---------- */

  function initGenreStrip() {
    var box = document.querySelector('[data-genre-strip]');
    if (!box || !window.FIELDS) return;
    var prompts = window.PROMPTS || [];
    box.innerHTML = window.FIELDS.genres.map(function (g) {
      var n = prompts.filter(function (p) { return p.genre === g; }).length;
      return '<a class="genre-chip" href="prompts.html?genre=' + encodeURIComponent(g) + '">' + App.genreBadge(g) +
        '<span>' + App.escape(g) + (n ? ' <span class="muted">· ' + n + '</span>' : '') + '</span></a>';
    }).join('');
  }

  /* ---------- Мягкое появление блоков при прокрутке ---------- */

  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      for (var i = 0; i < els.length; i++) els[i].classList.add('is-in');
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -40px 0px' });
    for (var j = 0; j < els.length; j++) io.observe(els[j]);
    // При печати показываем всё сразу
    window.addEventListener('beforeprint', function () {
      for (var k = 0; k < els.length; k++) els[k].classList.add('is-in');
    });
  }

  function injectSprite() {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">';
    for (var k in ICONS) {
      if (Object.prototype.hasOwnProperty.call(ICONS, k)) {
        s += '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + ICONS[k] + '</symbol>';
      }
    }
    s += '</svg>';
    var holder = document.createElement('div');
    holder.innerHTML = s;
    document.body.insertBefore(holder.firstChild, document.body.firstChild);
  }

  /* ---------- Тема ---------- */

  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function effectiveTheme() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  }

  function syncThemeButton() {
    var eff = effectiveTheme();
    root.setAttribute('data-theme-effective', eff);
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-label', eff === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
      btns[i].setAttribute('title', eff === 'dark' ? 'Светлая тема' : 'Тёмная тема');
    }
  }

  function initTheme() {
    var saved = App.store.get('theme', null);
    if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
    syncThemeButton();
    if (darkQuery) {
      var onChange = function () { syncThemeButton(); };
      if (darkQuery.addEventListener) darkQuery.addEventListener('change', onChange);
      else if (darkQuery.addListener) darkQuery.addListener(onChange);
    }
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-theme-toggle]');
      if (!btn) return;
      var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      App.store.set('theme', next);
      syncThemeButton();
    });
  }

  /* ---------- Меню на телефоне ---------- */

  function initMenu() {
    var btn = document.querySelector('.menu-btn');
    var nav = document.getElementById('site-nav');
    if (!btn || !nav) return;
    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      btn.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
    }
    btn.addEventListener('click', function () {
      setOpen(!nav.classList.contains('is-open'));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        btn.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !btn.contains(e.target)) setOpen(false);
    });
  }

  /* ---------- Тосты ---------- */

  var toastRegion;
  App.toast = function (message, icon) {
    if (!toastRegion) {
      toastRegion = document.createElement('div');
      toastRegion.className = 'toast-region';
      toastRegion.setAttribute('role', 'status');
      toastRegion.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastRegion);
    }
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = App.icon(icon || 'check') + '<span></span>';
    el.querySelector('span').textContent = message;
    toastRegion.appendChild(el);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add('show'); });
    });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 250);
    }, 3200);
  };

  /* ---------- Копирование ---------- */

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    var active = document.activeElement;
    ta.select();
    ta.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    if (active && active.focus) active.focus();
    return ok;
  }

  /* Возвращает Promise<boolean>. message — текст тоста (по умолчанию «Скопировано»). */
  App.copy = function (text, message) {
    function done(ok) {
      if (ok) App.toast(message || 'Скопировано');
      else App.toast('Не получилось скопировать. Выделите текст и скопируйте вручную.', 'warn');
      return ok;
    }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () {
        return done(true);
      }, function () {
        return done(fallbackCopy(text));
      });
    }
    return Promise.resolve(done(fallbackCopy(text)));
  };

  /* ---------- Скачивание .txt ---------- */

  App.download = function (filename, text) {
    var blob = new Blob(['﻿' + text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  /* ---------- Избранное и «Мои промпты» ---------- */

  App.favs = {
    list: function () { return App.store.get('favorites', []); },
    has: function (id) { return App.favs.list().indexOf(id) !== -1; },
    toggle: function (id) {
      var list = App.favs.list();
      var i = list.indexOf(id);
      if (i === -1) list.push(id); else list.splice(i, 1);
      App.store.set('favorites', list);
      updateBadge();
      return i === -1;
    }
  };

  App.saved = {
    list: function () { return App.store.get('saved', []); },
    add: function (item) {
      var list = App.saved.list();
      item.id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      item.date = Date.now();
      list.unshift(item);
      var ok = App.store.set('saved', list);
      updateBadge();
      return ok;
    },
    remove: function (id) {
      App.store.set('saved', App.saved.list().filter(function (x) { return x.id !== id; }));
      updateBadge();
    }
  };

  function updateBadge() {
    var n = App.saved.list().length + App.favs.list().length;
    var els = document.querySelectorAll('[data-my-count]');
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = n;
      els[i].setAttribute('data-count', n);
    }
    var links = document.querySelectorAll('.my-link');
    for (var j = 0; j < links.length; j++) {
      links[j].setAttribute('aria-label', 'Мои промпты и избранное: ' + n);
    }
  }
  App.updateBadge = updateBadge;

  /* ---------- Окно с QR-кодом ---------- */

  var qrDialog;
  /* options: { title, url, choices: [{id,name,url}], selected } */
  App.showQR = function (options) {
    if (!window.QR) return;
    if (!qrDialog) {
      qrDialog = document.createElement('dialog');
      qrDialog.className = 'modal';
      qrDialog.setAttribute('aria-labelledby', 'qr-title');
      qrDialog.innerHTML =
        '<div class="modal-head"><h2 id="qr-title"></h2>' +
        '<button type="button" class="icon-btn" data-close aria-label="Закрыть">' + App.icon('close') + '</button></div>' +
        '<div class="modal-body"><div class="chips" role="radiogroup" aria-label="Куда ведёт QR-код"></div>' +
        '<div class="qr-box"><canvas width="240" height="240" role="img"></canvas></div>' +
        '<p class="qr-url"></p><p class="muted" style="margin:8px 0 0;font-size:.88rem">Наведите камеру телефона на код.</p></div>';
      document.body.appendChild(qrDialog);
      qrDialog.addEventListener('click', function (e) {
        if (e.target === qrDialog || e.target.closest('[data-close]')) closeQR();
      });
    }
    qrDialog.querySelector('#qr-title').textContent = options.title || 'QR-код';
    var chipsBox = qrDialog.querySelector('.chips');
    var canvas = qrDialog.querySelector('canvas');
    var urlEl = qrDialog.querySelector('.qr-url');

    function render(url, label) {
      window.QR.draw(canvas, url, { size: 240 });
      canvas.setAttribute('aria-label', 'QR-код со ссылкой ' + (label ? 'на ' + label + ': ' : '') + url);
      urlEl.textContent = url;
    }

    chipsBox.innerHTML = '';
    if (options.choices && options.choices.length) {
      chipsBox.hidden = false;
      options.choices.forEach(function (c) {
        var lab = document.createElement('label');
        lab.className = 'chip';
        lab.innerHTML = '<input type="radio" name="qr-target"><span></span>';
        lab.querySelector('span').textContent = c.name;
        var input = lab.querySelector('input');
        input.value = c.id;
        if (c.id === options.selected) input.checked = true;
        input.addEventListener('change', function () { render(c.url, c.name); });
        chipsBox.appendChild(lab);
      });
      var sel = options.choices.filter(function (c) { return c.id === options.selected; })[0] || options.choices[0];
      if (!options.selected) chipsBox.querySelector('input').checked = true;
      render(sel.url, sel.name);
    } else {
      chipsBox.hidden = true;
      render(options.url);
    }

    if (qrDialog.showModal) qrDialog.showModal();
    else qrDialog.setAttribute('open', '');
    qrDialog.querySelector('[data-close]').focus();
  };

  function closeQR() {
    if (!qrDialog) return;
    if (qrDialog.close) qrDialog.close();
    else qrDialog.removeAttribute('open');
  }

  /* ---------- Печать ---------- */

  // Перед печатью раскрываем все <details>, после — возвращаем как было
  var openedForPrint = [];
  window.addEventListener('beforeprint', function () {
    openedForPrint = [];
    var ds = document.querySelectorAll('details:not([open])');
    for (var i = 0; i < ds.length; i++) {
      ds[i].setAttribute('open', '');
      openedForPrint.push(ds[i]);
    }
  });
  window.addEventListener('afterprint', function () {
    openedForPrint.forEach(function (d) { d.removeAttribute('open'); });
    openedForPrint = [];
  });

  /* ---------- Подвал: обратная связь ---------- */

  function initFeedback() {
    var url = window.LINKS && window.LINKS.feedback;
    var links = document.querySelectorAll('[data-feedback-link]');
    for (var i = 0; i < links.length; i++) {
      if (!App.isTodo(url)) {
        links[i].href = url;
        links[i].target = '_blank';
        links[i].rel = 'noopener';
      } else {
        links[i].addEventListener('click', function (e) {
          e.preventDefault();
          App.toast('Форма обратной связи скоро появится', 'info');
        });
      }
    }
  }

  /* ---------- QR-код на сам сайт (главная) ---------- */

  App.siteUrl = function () {
    var configured = window.LINKS && window.LINKS.site;
    var isWeb = location.protocol === 'http:' || location.protocol === 'https:';
    var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (isWeb && !isLocal) return location.href.replace(/[?#].*$/, '').replace(/index\.html$/, '');
    return App.isTodo(configured) ? null : configured;
  };

  function initSiteQR() {
    var canvas = document.querySelector('[data-site-qr]');
    if (!canvas || !window.QR) return;
    var note = document.querySelector('[data-site-qr-note]');
    var bigBtn = document.querySelector('[data-site-qr-big]');
    var url = App.siteUrl();
    if (!url) {
      canvas.parentNode.hidden = true;
      if (bigBtn) bigBtn.hidden = true;
      if (note) note.textContent = 'Сейчас сайт открыт с компьютера, а не из интернета. QR-код появится здесь, когда сайт будет опубликован (адрес можно указать в файле js/data.js, поле site).';
      return;
    }
    window.QR.draw(canvas, url, { size: 200 });
    canvas.setAttribute('aria-label', 'QR-код со ссылкой на сайт: ' + url);
    if (note) note.textContent = url;
    if (bigBtn) {
      bigBtn.addEventListener('click', function () {
        App.showQR({ title: 'Ссылка на ИИ-Шпаргалку', url: url });
      });
    }
  }

  /* ---------- Чек-лист проверки плана (страница «Как это работает») ---------- */

  function initChecklist() {
    var list = document.querySelector('[data-checklist]');
    if (!list) return;
    var boxes = list.querySelectorAll('input[type="checkbox"]');
    var bar = document.querySelector('[data-checklist-bar]');
    var text = document.querySelector('[data-checklist-text]');
    var progress = document.querySelector('[data-checklist-progress]');
    var saved = App.store.get('checklist', []);
    for (var i = 0; i < boxes.length; i++) boxes[i].checked = saved.indexOf(boxes[i].value) !== -1;

    function sync() {
      var done = [], total = boxes.length;
      for (var j = 0; j < boxes.length; j++) if (boxes[j].checked) done.push(boxes[j].value);
      var pct = Math.round(done.length / total * 100);
      bar.style.width = pct + '%';
      progress.setAttribute('aria-valuenow', done.length);
      text.textContent = done.length === total
        ? 'Проверено ' + total + ' из ' + total + ' — план можно нести на урок!'
        : 'Проверено ' + done.length + ' из ' + total;
      App.store.set('checklist', done);
    }
    list.addEventListener('change', sync);
    var resetBtn = document.querySelector('[data-checklist-reset]');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        for (var j = 0; j < boxes.length; j++) boxes[j].checked = false;
        sync();
        boxes[0].focus();
      });
    }
    var printBtn = document.querySelector('[data-checklist-print]');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
    sync();
  }

  /* ---------- Таблица нормативных документов (из LINKS.docs) ---------- */

  function initDocsTable() {
    var tbody = document.querySelector('[data-docs-table]');
    if (!tbody) return;
    var docs = (window.LINKS && window.LINKS.docs) || [];
    tbody.innerHTML = docs.map(function (d) {
      var link = App.isTodo(d.url)
        ? '<span class="todo">TODO: проверить ссылку</span>'
        : '<a href="' + App.escape(d.url) + '" target="_blank" rel="noopener noreferrer">' + App.escape(d.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) +
          '<span class="visually-hidden"> (откроется в новой вкладке)</span></a>';
      return '<tr><td data-label="Документ"><strong>' + App.escape(d.name) + '</strong></td>' +
        '<td data-label="Зачем нужен">' + App.escape(d.why) + '</td>' +
        '<td data-label="Ссылка" style="overflow-wrap:anywhere">' + link + '</td></tr>';
    }).join('');
  }

  /* ---------- Удалить все данные сайта из браузера ---------- */

  function initClearData() {
    var btn = document.querySelector('[data-clear-data]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!window.confirm('Удалить с этого устройства всё, что сохранил сайт: «Мои промпты», избранное, черновик конструктора, чек-лист и выбор темы?')) return;
      try {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0) keys.push(k);
        }
        keys.forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) { /* хранилище недоступно — удалять нечего */ }
      root.removeAttribute('data-theme');
      syncThemeButton();
      updateBadge();
      App.toast('Готово: данные сайта удалены с этого устройства');
    });
  }

  /* ---------- Офлайн-режим (service worker) ---------- */

  function initServiceWorker() {
    // При открытии файла двойным кликом (file://) service worker не работает — просто пропускаем
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    window.addEventListener('load', function () {
      try {
        navigator.serviceWorker.register('sw.js').catch(function () { /* без офлайна */ });
      } catch (e) { /* без офлайна */ }
    });
  }

  /* ---------- Запуск ---------- */

  injectSprite();
  injectArt();
  initGenreStrip();
  initReveal();
  initTheme();
  initMenu();
  initFeedback();
  initChecklist();
  initDocsTable();
  initClearData();
  updateBadge();
  initServiceWorker();

  window.addEventListener('storage', updateBadge);
  // qr.js и скрипты страниц подключаются после app.js — ждём, пока загрузятся все
  document.addEventListener('DOMContentLoaded', initSiteQR);
})();
