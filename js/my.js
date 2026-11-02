/* ИИ-Шпаргалка — «Мои промпты»: сохранённое из конструктора и избранное из базы. */
(function () {
  'use strict';

  var App = window.App;
  var Cards = window.PromptCards;

  var savedList = document.getElementById('saved-list');
  var favsList = document.getElementById('favs-list');

  /* ---------- Вкладки ---------- */

  var tabs = [document.getElementById('tab-saved'), document.getElementById('tab-favs')];

  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    App.store.set('myTab', tab.id);
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        selectTab(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true);
      }
    });
  });

  /* ---------- Сохранённые ---------- */

  function renderSaved() {
    var items = App.saved.list();
    document.getElementById('count-saved').textContent = items.length;
    document.getElementById('count-saved').setAttribute('data-count', items.length);
    document.getElementById('saved-empty').hidden = items.length !== 0;
    document.getElementById('saved-tools').hidden = items.length === 0;
    savedList.innerHTML = items.map(function (it) {
      return '<article class="card saved-item prompt-card" data-id="' + App.escape(it.id) + '">' +
        '<h3>' + App.escape(it.title || 'Промпт') + '</h3>' +
        '<p class="saved-meta">' + App.escape([it.meta, App.formatDate(it.date)].filter(Boolean).join(' · ')) + '</p>' +
        '<details><summary>Текст промпта</summary><pre class="prompt-text">' + App.escape(it.text) + '</pre></details>' +
        '<div class="btn-row">' +
          '<button type="button" class="btn btn-primary btn-sm" data-saved="copy">' + App.icon('copy') + 'Скопировать</button>' +
          '<button type="button" class="btn btn-outline btn-sm" data-saved="delete">' + App.icon('trash') + 'Удалить</button>' +
        '</div></article>';
    }).join('');
  }

  savedList.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-saved]');
    if (!btn) return;
    var card = btn.closest('[data-id]');
    var id = card.getAttribute('data-id');
    var item = App.saved.list().filter(function (x) { return x.id === id; })[0];
    if (!item) return;
    if (btn.getAttribute('data-saved') === 'copy') {
      App.copy(item.text);
    } else if (window.confirm('Удалить промпт «' + (item.title || 'Промпт') + '»?')) {
      App.saved.remove(id);
      renderSaved();
      App.toast('Промпт удалён', 'trash');
      var first = savedList.querySelector('button');
      (first || document.getElementById('tab-saved')).focus();
    }
  });

  document.getElementById('export-btn').addEventListener('click', function () {
    var items = App.saved.list();
    if (!items.length) return;
    var line = '\n\n' + new Array(41).join('=') + '\n\n';
    var text = 'ИИ-Шпаргалка — мои промпты\nВыгружено: ' + new Date().toLocaleString('ru-RU') + line +
      items.map(function (it, i) {
        return (i + 1) + '. ' + (it.title || 'Промпт') + '\n' + (it.meta ? it.meta + '\n' : '') + '\n' + it.text;
      }).join(line) + '\n';
    var d = new Date();
    var stamp = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    App.download('moi-prompty-' + stamp + '.txt', text);
    App.toast('Файл с промптами сохранён', 'download');
  });

  /* ---------- Избранное ---------- */

  function renderFavs() {
    var ids = App.favs.list();
    var prompts = ids.map(Cards.find).filter(Boolean);
    document.getElementById('count-favs').textContent = prompts.length;
    document.getElementById('count-favs').setAttribute('data-count', prompts.length);
    document.getElementById('favs-empty').hidden = prompts.length !== 0;
    favsList.innerHTML = prompts.map(Cards.render).join('');
  }

  Cards.bind(favsList, function (p, on) {
    if (!on) renderFavs();
  });

  /* ---------- Запуск ---------- */

  renderSaved();
  renderFavs();
  var lastTab = document.getElementById(App.store.get('myTab', 'tab-saved'));
  if (location.hash === '#favs') lastTab = tabs[1];
  selectTab(lastTab && tabs.indexOf(lastTab) !== -1 ? lastTab : tabs[0]);

  // Изменения в другой вкладке браузера
  window.addEventListener('storage', function () {
    renderSaved();
    renderFavs();
  });
})();
