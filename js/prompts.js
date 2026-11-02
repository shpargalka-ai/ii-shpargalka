/* ИИ-Шпаргалка — база промптов: карточки, фильтры, поиск, избранное.
   Карточки (PromptCards) используются ещё и на странице «Мои промпты». */
(function () {
  'use strict';

  var App = window.App;
  var F = window.FIELDS;
  var PROMPTS = window.PROMPTS || [];

  /* ---------- Карточка промпта ---------- */

  function placeholderHint(key) {
    var ph = F.placeholders[key];
    return ph ? ph.hint : key;
  }

  // Текст для копирования: {{тема}} → [впишите: тему урока]
  function copyText(p) {
    return p.template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, function (_, key) {
      return '[впишите: ' + placeholderHint(key) + ']';
    });
  }

  function templateHtml(p) {
    return p.template.split(/\{\{\s*([^}]+?)\s*\}\}/).map(function (part, i) {
      if (i % 2 === 0) return App.escape(part);
      return '<span class="ph">' + App.escape(placeholderHint(part)) + '</span>';
    }).join('');
  }

  function gradesLabel(grades) {
    if (!grades || !grades.length) return '';
    var min = Math.min.apply(null, grades), max = Math.max.apply(null, grades);
    return min === max ? min + ' класс' : min + '–' + max + ' класс';
  }

  function render(p) {
    var fav = App.favs.has(p.id);
    var tags = '<span class="tag tag-accent">' + App.escape(p.stage) + '</span>' +
      '<span class="tag">' + App.escape(p.genre) + '</span>' +
      (p.duration ? '<span class="tag">' + App.icon('clock') + p.duration + ' мин</span>' : '') +
      '<span class="tag">' + gradesLabel(p.grades) + '</span>';
    var subjects = p.subjects && p.subjects.length && p.subjects[0] !== 'Любой'
      ? p.subjects.join(', ') : 'любой предмет';
    var tips = (p.tips || []).map(function (t) { return '<li>' + App.escape(t) + '</li>'; }).join('');
    var ex = p.example || {};

    return '<article class="card prompt-card" id="p-' + App.escape(p.id) + '" data-id="' + App.escape(p.id) + '" aria-labelledby="t-' + App.escape(p.id) + '">' +
      '<div class="prompt-card-top">' + App.genreBadge(p.genre) + '<div class="tags">' + tags + '</div></div>' +
      '<h3 id="t-' + App.escape(p.id) + '">' + App.escape(p.title) + '</h3>' +
      '<p class="summary">' + App.escape(p.summary) + '</p>' +
      '<p class="muted" style="margin:0;font-size:.88rem">Подходит: ' + App.escape(subjects) + '</p>' +
      '<details><summary>Текст промпта</summary><pre class="prompt-text">' + templateHtml(p) + '</pre></details>' +
      (tips ? '<p class="tips-title">Что дописать</p><ul class="tips">' + tips + '</ul>' : '') +
      (ex.before ? '<details><summary>Пример: было → стало</summary><div class="example-grid">' +
        '<p><b>Было</b>' + App.escape(ex.before) + '</p>' +
        '<p><b>Стало</b>' + App.escape(ex.after) + '</p>' +
        '<p><b>Что получилось</b>' + App.escape(ex.result) + '</p></div></details>' : '') +
      '<div class="btn-row">' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="copy">' + App.icon('copy') + 'Скопировать</button>' +
        '<a class="btn btn-outline btn-sm" href="constructor.html?id=' + encodeURIComponent(p.id) + '">' + App.icon('wand') + 'Открыть в конструкторе</a>' +
        '<button type="button" class="btn btn-outline btn-sm" data-action="fav" aria-pressed="' + fav + '">' + App.icon('star') + '<span>' + (fav ? 'В избранном' : 'В избранное') + '</span></button>' +
        '<button type="button" class="icon-btn" data-action="print" aria-label="Распечатать карточку «' + App.escape(p.title) + '»" title="Распечатать">' + App.icon('print') + '</button>' +
      '</div>' +
    '</article>';
  }

  function find(id) {
    for (var i = 0; i < PROMPTS.length; i++) if (PROMPTS[i].id === id) return PROMPTS[i];
    return null;
  }

  function printCard(card) {
    document.body.classList.add('print-one');
    card.classList.add('is-printing');
    var cleanup = function () {
      document.body.classList.remove('print-one');
      card.classList.remove('is-printing');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1000);
  }

  // Обработка кнопок внутри контейнера с карточками. onFavChange — необязательный колбэк.
  function bind(container, onFavChange) {
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var card = btn.closest('.prompt-card');
      var p = card && find(card.getAttribute('data-id'));
      if (!p) return;
      var action = btn.getAttribute('data-action');
      if (action === 'copy') {
        App.copy(copyText(p), 'Скопировано. Допишите места в [скобках]');
      } else if (action === 'fav') {
        var on = App.favs.toggle(p.id);
        btn.setAttribute('aria-pressed', on);
        btn.querySelector('span').textContent = on ? 'В избранном' : 'В избранное';
        App.toast(on ? 'Добавлено в избранное' : 'Убрано из избранного', 'star');
        if (onFavChange) onFavChange(p, on);
      } else if (action === 'print') {
        printCard(card);
      }
    });
  }

  window.PromptCards = { render: render, bind: bind, copyText: copyText, find: find };

  /* ---------- Страница базы промптов ---------- */

  var list = document.getElementById('prompt-list');
  var filtersForm = document.getElementById('filters');
  if (!list || !filtersForm) return;

  var el = {
    q: document.getElementById('q'),
    subject: document.getElementById('f-subject'),
    grade: document.getElementById('f-grade'),
    stage: document.getElementById('f-stage'),
    genre: document.getElementById('f-genre'),
    time: document.getElementById('f-time'),
    fav: document.getElementById('f-fav'),
    count: document.getElementById('results-count'),
    empty: document.getElementById('empty'),
    emptyText: document.getElementById('empty-text')
  };

  var TIMES = [
    { value: 'short', label: 'До 20 минут', test: function (d) { return d <= 20; } },
    { value: 'lesson', label: '30–45 минут (урок)', test: function (d) { return d >= 30 && d <= 45; } },
    { value: 'double', label: '90 минут (сдвоенный)', test: function (d) { return d >= 90; } }
  ];

  function options(select, placeholder, items) {
    select.innerHTML = '<option value="">' + App.escape(placeholder) + '</option>' + items.map(function (it) {
      var v = typeof it === 'object' ? it.value : it;
      var l = typeof it === 'object' ? it.label : it;
      return '<option value="' + App.escape(v) + '">' + App.escape(l) + '</option>';
    }).join('');
  }

  function unique(field, preferredOrder) {
    var seen = {}, result = [];
    (preferredOrder || []).forEach(function (v) {
      if (PROMPTS.some(function (p) { return p[field] === v; }) && !seen[v]) { seen[v] = 1; result.push(v); }
    });
    PROMPTS.forEach(function (p) {
      if (!seen[p[field]]) { seen[p[field]] = 1; result.push(p[field]); }
    });
    return result;
  }

  options(el.subject, 'Любой предмет', F.subjects);
  options(el.grade, 'Любой класс', F.grades.map(function (g) { return { value: g, label: g + ' класс' }; }));
  options(el.stage, 'Любой этап', unique('stage', F.stages));
  options(el.genre, 'Любой жанр', unique('genre', F.genres));
  options(el.time, 'Любое время', TIMES);

  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е');
  }

  // Строка для поиска по каждой карточке — считаем один раз
  var haystack = {};
  PROMPTS.forEach(function (p) {
    haystack[p.id] = norm([p.title, p.summary, p.stage, p.genre, (p.subjects || []).join(' '), (p.tips || []).join(' '), p.template].join(' '));
  });

  function matches(p) {
    var subject = el.subject.value;
    if (subject && !(p.subjects || []).some(function (s) { return s === subject || s === 'Любой'; })) return false;
    var grade = el.grade.value;
    if (grade && (p.grades || []).indexOf(+grade) === -1) return false;
    if (el.stage.value && p.stage !== el.stage.value) return false;
    if (el.genre.value && p.genre !== el.genre.value) return false;
    if (el.time.value && p.duration) {
      var t = TIMES.filter(function (x) { return x.value === el.time.value; })[0];
      if (t && !t.test(p.duration)) return false;
    }
    if (el.fav.checked && !App.favs.has(p.id)) return false;
    var q = norm(el.q.value).trim();
    if (q) {
      var words = q.split(/\s+/);
      for (var i = 0; i < words.length; i++) if (haystack[p.id].indexOf(words[i]) === -1) return false;
    }
    return true;
  }

  function anyFilter() {
    return !!(el.q.value.trim() || el.subject.value || el.grade.value || el.stage.value || el.genre.value || el.time.value || el.fav.checked);
  }

  function apply() {
    var found = PROMPTS.filter(matches);
    list.innerHTML = found.map(render).join('');
    var n = found.length;
    el.count.textContent = 'Найдено ' + n + ' ' + App.plural(n, 'промпт', 'промпта', 'промптов');
    el.empty.hidden = n !== 0;
    if (n === 0) {
      el.emptyText.textContent = el.fav.checked && !App.favs.list().length
        ? 'В избранном пока пусто. Нажмите «В избранное» на любой карточке — и она появится здесь.'
        : 'Попробуйте убрать один из фильтров — или соберите свой промпт в конструкторе.';
    }
    document.getElementById('reset-filters').hidden = !anyFilter();
  }

  function reset() {
    filtersForm.reset();
    apply();
    el.q.focus();
  }

  filtersForm.addEventListener('input', apply);
  filtersForm.addEventListener('change', apply);
  document.getElementById('reset-filters').addEventListener('click', reset);
  document.getElementById('empty-reset').addEventListener('click', reset);
  bind(list, function () { if (el.fav.checked) apply(); });

  // Ссылка вида prompts.html#p-id — подсветить нужную карточку
  if (App.qs('fav') === '1') el.fav.checked = true;
  // prompts.html?genre=Детектив — переход из полосы жанров на главной
  var genreParam = App.qs('genre');
  if (genreParam) el.genre.value = genreParam;
  apply();
  if (location.hash) {
    var target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView();
  }
})();
