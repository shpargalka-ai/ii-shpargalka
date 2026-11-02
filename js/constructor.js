/* ИИ-Шпаргалка — конструктор промпта.
   Форма → состояние → шаблон с {{плейсхолдерами}} → живое превью.
   Незаполненные плейсхолдеры подсвечиваются жёлтым, в копии они остаются в [квадратных скобках]. */
(function () {
  'use strict';

  var App = window.App;
  var F = window.FIELDS;
  var PROMPTS = window.PROMPTS || [];
  var LINKS = window.LINKS || { ai: [] };

  var form = document.getElementById('builder-form');
  var preview = document.getElementById('preview');
  var gapCounter = document.getElementById('gap-counter');
  var templateSelect = document.getElementById('template');
  var subjectSelect = document.getElementById('subject');
  var subjectCustom = document.getElementById('subject-custom');

  var OTHER = '__other';
  var UNIVERSAL = 'universal';
  var DEFAULT_OUTPUTS = ['legend', 'timing', 'cards', 'keys', 'reflex'];

  // Что важно на каждом этапе урока (только для универсального шаблона)
  var STAGE_NOTES = {
    'Начало урока': 'вовлечь класс в первые минуты и подвести учеников к цели урока так, чтобы они сформулировали её сами',
    'Объяснение': 'чтобы ученики сами добыли новое знание, а не слушали лекцию',
    'Закрепление': 'чтобы ученики применили изученное в новых ситуациях, а не просто повторили определения',
    'Рефлексия': 'чтобы ученики честно оценили, что поняли, а что осталось непонятным',
    'Контроль': 'честно проверить знания каждого ученика, а не только самых активных'
  };

  // Подсказка нейросети, как устроен жанр
  var GENRE_NOTES = {
    'Детектив': 'Ученики — следователи: собирают улики, проверяют версии и раскрывают дело, применяя знания по теме.',
    'Ролевая игра': 'У каждого ученика или группы — своя роль с целью и интересами; решения принимаются от лица героя.',
    'Экономическая симуляция': 'У команд есть ограниченный ресурс (бюджет, время, материалы); они принимают решения и видят их последствия.',
    'Эко-триллер': 'Сюжет — угроза для природы или города, которую нужно предотвратить, пока не вышло время; спасти ситуацию помогают знания по теме.',
    'Станционная игра': 'Класс проходит станции по маршрутному листу; на каждой станции — одно задание и чёткое время.',
    'Квиз-баттл': 'Команды соревнуются в раундах с вопросами разного типа; есть табло, баллы и финальный раунд.',
    'Расследование': 'Ученики работают с источниками и данными, выдвигают гипотезы и доказывают вывод.',
    'Суд над историческим явлением': 'Класс проводит суд: обвинение, защита, свидетели и присяжные; вердикт выносится только на основе аргументов.',
    'Редакция газеты': 'Класс — редакция: отделы готовят материалы для выпуска газеты по теме урока, главный редактор собирает номер.'
  };

  /* ---------- Состояние ---------- */

  function defaultState() {
    return {
      template: UNIVERSAL,
      subject: '',
      subjectCustom: '',
      grade: '',
      topic: '',
      count: '',
      stage: '',
      genre: '',
      duration: '',
      goal: '',
      features: [],
      featuresCustom: '',
      limits: '',
      outputs: DEFAULT_OUTPUTS.slice()
    };
  }

  var state = defaultState();

  function findPrompt(id) {
    for (var i = 0; i < PROMPTS.length; i++) if (PROMPTS[i].id === id) return PROMPTS[i];
    return null;
  }

  /* ---------- Построение формы из data.js ---------- */

  function chip(type, name, value, label) {
    return '<label class="chip"><input type="' + type + '" name="' + name + '" value="' + App.escape(value) + '"><span>' + App.escape(label) + '</span></label>';
  }

  function check(name, value, label) {
    return '<label class="check"><input type="checkbox" name="' + name + '" value="' + App.escape(value) + '"><span>' + App.escape(label) + '</span></label>';
  }

  function buildForm() {
    // Шаблоны: универсальный + готовые промпты, сгруппированные по этапам
    var html = '<option value="' + UNIVERSAL + '">Универсальный — собирается из формы</option>';
    var groups = {};
    var order = [];
    PROMPTS.forEach(function (p) {
      if (!groups[p.stage]) { groups[p.stage] = []; order.push(p.stage); }
      groups[p.stage].push(p);
    });
    order.forEach(function (stage) {
      html += '<optgroup label="' + App.escape(stage) + '">';
      groups[stage].forEach(function (p) {
        html += '<option value="' + App.escape(p.id) + '">' + App.escape(p.title) + '</option>';
      });
      html += '</optgroup>';
    });
    templateSelect.innerHTML = html;

    subjectSelect.innerHTML = '<option value="">— выберите предмет —</option>' +
      F.subjects.map(function (s) { return '<option>' + App.escape(s) + '</option>'; }).join('') +
      '<option value="' + OTHER + '">Другой предмет…</option>';

    document.getElementById('grade-chips').innerHTML = F.grades.map(function (g) { return chip('radio', 'grade', g, g); }).join('');
    document.getElementById('stage-chips').innerHTML = F.stages.map(function (s) { return chip('radio', 'stage', s, s); }).join('');
    document.getElementById('genre-chips').innerHTML = F.genres.map(function (g) { return chip('radio', 'genre', g, g); }).join('');
    document.getElementById('duration-chips').innerHTML = F.durations.map(function (d) { return chip('radio', 'duration', d, d); }).join('');
    document.getElementById('features').innerHTML = F.features.map(function (f) { return check('features', f.id, f.label); }).join('');
    document.getElementById('outputs').innerHTML = F.outputs.map(function (o) { return check('outputs', o.id, o.label); }).join('');

    // Кнопки нейросетей
    document.getElementById('ai-buttons').innerHTML = LINKS.ai.map(function (ai) {
      return '<a class="btn btn-outline" data-ai="' + App.escape(ai.id) + '" href="' + App.escape(ai.url) + '" target="_blank" rel="noopener noreferrer" title="' + App.escape(ai.note || '') + '">' +
        App.icon('external') + '<span class="visually-hidden">Открыть </span>' + App.escape(ai.name) + '<span class="visually-hidden"> (в новой вкладке)</span></a>';
    }).join('');

    // Дожимы
    document.getElementById('refine-list').innerHTML = F.refine.map(function (r, i) {
      return '<button type="button" class="btn" data-refine="' + i + '">' + App.icon('copy') + App.escape(r.label) + '</button>';
    }).join('');
  }

  /* ---------- Форма ⇄ состояние ---------- */

  function radioValue(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function checkedValues(name) {
    return Array.prototype.map.call(form.querySelectorAll('input[name="' + name + '"]:checked'), function (el) { return el.value; });
  }

  function readForm() {
    state.template = templateSelect.value;
    state.subject = subjectSelect.value;
    state.subjectCustom = subjectCustom.value;
    state.grade = radioValue('grade');
    state.topic = form.topic.value;
    state.count = form.count.value;
    state.stage = radioValue('stage');
    state.genre = radioValue('genre');
    state.duration = radioValue('duration');
    state.goal = form.goal.value;
    state.features = checkedValues('features');
    state.featuresCustom = form.featuresCustom.value;
    state.limits = form.limits.value;
    state.outputs = checkedValues('outputs');
  }

  function setRadio(name, value) {
    var inputs = form.querySelectorAll('input[name="' + name + '"]');
    for (var i = 0; i < inputs.length; i++) inputs[i].checked = String(inputs[i].value) === String(value);
  }

  function setChecks(name, values) {
    var inputs = form.querySelectorAll('input[name="' + name + '"]');
    for (var i = 0; i < inputs.length; i++) inputs[i].checked = values.indexOf(inputs[i].value) !== -1;
  }

  function writeForm() {
    templateSelect.value = findPrompt(state.template) ? state.template : UNIVERSAL;
    subjectSelect.value = state.subject;
    if (subjectSelect.value !== state.subject) subjectSelect.value = '';
    subjectCustom.value = state.subjectCustom;
    subjectCustom.hidden = state.subject !== OTHER;
    setRadio('grade', state.grade);
    form.topic.value = state.topic;
    form.count.value = state.count;
    setRadio('stage', state.stage);
    setRadio('genre', state.genre);
    setRadio('duration', state.duration);
    form.goal.value = state.goal;
    setChecks('features', state.features);
    form.featuresCustom.value = state.featuresCustom;
    form.limits.value = state.limits;
    setChecks('outputs', state.outputs);
  }

  /* ---------- Значения для плейсхолдеров ---------- */

  function lowerFirst(s) {
    if (!s) return s;
    if (/^[А-ЯЁA-Z]{2,}/.test(s)) return s; // аббревиатуры: ОБЗР
    return s.charAt(0).toLowerCase() + s.slice(1);
  }

  function upperFirst(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function values() {
    var subject = state.subject === OTHER ? state.subjectCustom.trim() : state.subject;
    var features = state.features.map(function (id) {
      var f = byId(F.features, id);
      return f ? f.text : '';
    }).filter(Boolean);
    if (state.featuresCustom.trim()) features.push(state.featuresCustom.trim());
    var outputs = state.outputs.map(function (id) {
      var o = byId(F.outputs, id);
      return o ? o.text : '';
    }).filter(Boolean);

    return {
      'предмет': lowerFirst(subject),
      'класс': state.grade,
      'тема': state.topic.trim(),
      'количество': String(state.count).trim(),
      'время': state.duration,
      'этап': lowerFirst(state.stage),
      'жанр': state.genre,
      'цель': state.goal.trim().replace(/\s+/g, ' '),
      'особенности': features.join('; '),
      'ограничения': state.limits.trim().replace(/\s+/g, ' '),
      'формат': outputs.length ? 'Обязательно включи в ответ: ' + outputs.join(', ') + '.' : ''
    };
  }

  /* ---------- Универсальный шаблон ---------- */

  function universalTemplate() {
    var L = [];
    L.push('Ты — опытный методист и учитель с 15-летним стажем, предмет — {{предмет}}. Ты умеешь превращать уроки в игры, которые работают в обычном школьном классе.');
    L.push('');
    L.push('Контекст:');
    L.push('— Тема урока: {{тема}}');
    L.push('— Класс: {{класс}}');
    L.push('— Количество учеников: {{количество}}');
    L.push('— Этап урока: {{этап}}');
    L.push('— Время: {{время}} минут');
    L.push('— Цель урока: {{цель}}');
    L.push('— Особенности класса: {{особенности}}');
    L.push('');
    L.push('Задача: разработай план игрового урока (или его части) в жанре «{{жанр}}» по этой теме.');
    if (STAGE_NOTES[state.stage]) L.push('Главное на этом этапе — ' + STAGE_NOTES[state.stage] + '.');
    if (GENRE_NOTES[state.genre]) L.push(GENRE_NOTES[state.genre]);
    L.push('');
    L.push('Ограничения:');
    L.push('— Сумма тайминга всех этапов — ровно {{время}} минут.');
    L.push('— Все формулировки понятны ученикам {{класс}} класса.');
    L.push('— Задания проверяют цель урока, а не общую эрудицию.');
    L.push('— Подготовка учителя — не больше 30 минут, материалы — то, что есть в обычной школе.');
    if (state.limits.trim()) L.push('— Дополнительно: {{ограничения}}');
    L.push('');
    var outputs = state.outputs.map(function (id) { return byId(F.outputs, id); }).filter(Boolean);
    if (outputs.length) {
      L.push('Формат ответа — по порядку:');
      outputs.forEach(function (o, i) { L.push((i + 1) + '. ' + upperFirst(o.text) + '.'); });
    } else {
      L.push('Формат ответа: {{формат}}');
    }
    L.push('');
    L.push('Критерии качества:');
    L.push('— Каждый ученик занят на каждом этапе, никто не ждёт без дела.');
    L.push('— Задания идут от простого к сложному.');
    L.push('— Есть задание для тех, кто справится раньше остальных.');
    L.push('— Всё реально провести в обычном классе с учётом моих особенностей.');
    L.push('');
    L.push('Не используй персональные данные учеников. Если данных не хватает — задай мне максимум 3 уточняющих вопроса, прежде чем отвечать.');
    return L.join('\n');
  }

  function currentTemplate() {
    var p = findPrompt(state.template);
    return p ? p.template : universalTemplate();
  }

  function templateKeys(tpl) {
    var keys = {};
    tpl.replace(/\{\{\s*([^}]+?)\s*\}\}/g, function (_, k) { keys[k] = true; return _; });
    return keys;
  }

  /* ---------- Сборка промпта ---------- */

  function hintFor(key) {
    var ph = F.placeholders[key];
    return 'здесь лучше дописать: ' + (ph ? ph.hint : key);
  }

  // Возвращает { html, text, missing: [ключи] }
  function assemble() {
    var tpl = currentTemplate();
    var vals = values();
    var parts = tpl.split(/\{\{\s*([^}]+?)\s*\}\}/);
    var html = '', text = '', missing = [];
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        html += App.escape(parts[i]);
        text += parts[i];
        continue;
      }
      var key = parts[i];
      var v = vals[key];
      if (v) {
        html += App.escape(v);
        text += v;
      } else {
        var hint = hintFor(key);
        html += '<mark class="gap" data-key="' + App.escape(key) + '" title="Нажмите, чтобы заполнить">' + App.escape(hint) + '</mark>';
        text += '[' + hint + ']';
        if (missing.indexOf(key) === -1) missing.push(key);
      }
    }
    // Пустая строка «формат» в конце шаблона не должна оставлять лишних отступов
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    return { html: html.replace(/\n{3,}/g, '\n\n').trim(), text: text, missing: missing };
  }

  var current = { text: '', missing: [] };

  function update(save) {
    readForm();
    subjectCustom.hidden = state.subject !== OTHER;
    var res = assemble();
    current = res;
    preview.innerHTML = res.html;

    var n = res.missing.length;
    if (n) {
      gapCounter.className = 'gap-counter';
      gapCounter.textContent = 'Не заполнено: ' + n;
    } else {
      gapCounter.className = 'gap-counter ok';
      gapCounter.textContent = 'Всё заполнено';
    }
    var jump = document.getElementById('jump-text');
    if (jump) jump.textContent = n ? 'Промпт готов · не заполнено ' + n : 'Промпт готов · всё заполнено';

    markUnused();
    document.querySelector('[data-print-title]').textContent = promptTitle();
    if (save !== false) App.store.set('draft', state);
  }

  // Поля, которых нет в выбранном шаблоне, приглушаем
  function markUnused() {
    var keys = templateKeys(currentTemplate());
    var fields = form.querySelectorAll('[data-key]');
    for (var i = 0; i < fields.length; i++) {
      fields[i].classList.toggle('field-unused', !keys[fields[i].getAttribute('data-key')]);
    }
  }

  function promptTitle() {
    var p = findPrompt(state.template);
    var v = values();
    var parts = [];
    if (v['тема']) parts.push(v['тема']);
    if (v['класс']) parts.push(v['класс'] + ' класс');
    var base = p ? p.title : 'Свой промпт' + (state.genre ? ' («' + state.genre + '»)' : '');
    return parts.length ? base + ': ' + parts.join(', ') : base;
  }

  /* ---------- Выбор шаблона ---------- */

  function showTemplateInfo() {
    var p = findPrompt(state.template);
    var box = document.getElementById('template-info');
    if (!p) { box.hidden = true; return; }
    box.hidden = false;
    document.getElementById('template-summary').textContent = p.summary;
    document.getElementById('template-tips').innerHTML = (p.tips || []).map(function (t) {
      return '<li>' + App.escape(t) + '</li>';
    }).join('');
  }

  function applyTemplateDefaults(p) {
    if (!p) return;
    if (F.stages.indexOf(p.stage) !== -1) state.stage = p.stage;
    if (F.genres.indexOf(p.genre) !== -1) state.genre = p.genre;
    if (p.duration && F.durations.indexOf(p.duration) !== -1) state.duration = String(p.duration);
    // Если у промпта один конкретный предмет — подставим его, если предмет ещё не выбран
    if (!state.subject && p.subjects && p.subjects.length === 1 && F.subjects.indexOf(p.subjects[0]) !== -1) {
      state.subject = p.subjects[0];
    }
  }

  function setUrlTemplate(id) {
    if (!window.history || !history.replaceState) return;
    try {
      var url = location.pathname + (id && id !== UNIVERSAL ? '?id=' + encodeURIComponent(id) : '');
      history.replaceState(null, '', url);
    } catch (e) { /* file:// в некоторых браузерах не даёт менять адрес */ }
  }

  /* ---------- Переход к полю по клику на жёлтую подсказку ---------- */

  var FOCUS_TARGETS = {
    'предмет': '#subject',
    'класс': 'input[name="grade"]',
    'тема': '#topic',
    'количество': '#count',
    'время': 'input[name="duration"]',
    'этап': 'input[name="stage"]',
    'жанр': 'input[name="genre"]',
    'цель': '#goal',
    'особенности': 'input[name="features"]',
    'ограничения': '#limits',
    'формат': 'input[name="outputs"]'
  };

  function focusField(key) {
    var sel = FOCUS_TARGETS[key];
    var el = sel && form.querySelector(sel);
    if (!el) return;
    if (key === 'предмет' && state.subject === OTHER) el = subjectCustom;
    el.focus();
    var box = el.closest('.field') || el;
    if (box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- Действия ---------- */

  function copyPrompt(message) {
    var msg = message || 'Скопировано';
    if (current.missing.length && !message) {
      msg = 'Скопировано. Допишите в чате места в [скобках]';
    }
    return App.copy(current.text, msg);
  }

  function initActions() {
    document.getElementById('copy-btn').addEventListener('click', function () { copyPrompt(); });

    document.getElementById('ai-buttons').addEventListener('click', function (e) {
      var a = e.target.closest('[data-ai]');
      if (!a) return;
      App.store.set('lastAi', a.getAttribute('data-ai'));
      // Ссылка откроется сама (target=_blank), а промпт заранее уйдёт в буфер обмена
      copyPrompt('Промпт скопирован — вставьте его в чат');
    });

    document.getElementById('qr-btn').addEventListener('click', function () {
      App.showQR({
        title: 'Открыть нейросеть с телефона',
        choices: LINKS.ai,
        selected: App.store.get('lastAi', LINKS.ai[0] && LINKS.ai[0].id)
      });
    });

    document.getElementById('print-btn').addEventListener('click', function () { window.print(); });

    document.getElementById('save-btn').addEventListener('click', function () {
      var v = values();
      var ok = App.saved.add({
        title: promptTitle(),
        text: current.text,
        meta: [state.subject === OTHER ? state.subjectCustom : state.subject, v['класс'] ? v['класс'] + ' класс' : '', state.genre, state.duration ? state.duration + ' мин' : ''].filter(Boolean).join(' · ')
      });
      if (ok) App.toast('Сохранено в «Мои промпты»', 'save');
      else App.toast('Не получилось сохранить: браузер запрещает хранилище', 'warn');
    });

    document.getElementById('refine-list').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-refine]');
      if (!btn) return;
      var r = F.refine[+btn.getAttribute('data-refine')];
      App.copy(r.text, 'Скопировано — вставьте в тот же чат с нейросетью');
    });

    document.getElementById('reset-form').addEventListener('click', function () {
      state = defaultState();
      writeForm();
      showTemplateInfo();
      setUrlTemplate(UNIVERSAL);
      update();
      App.toast('Форма очищена', 'reset');
    });

    preview.addEventListener('click', function (e) {
      var mark = e.target.closest('mark.gap');
      if (mark) focusField(mark.getAttribute('data-key'));
    });
  }

  /* ---------- Плашка «к промпту» на телефоне ---------- */

  function initJumpBar() {
    var bar = document.getElementById('jump-bar');
    var card = document.getElementById('preview-card');
    if (!bar || !card || !('IntersectionObserver' in window)) return;
    var formVisible = false, cardVisible = false;
    function sync() { bar.classList.toggle('show', formVisible && !cardVisible); }
    new IntersectionObserver(function (entries) {
      cardVisible = entries[0].isIntersecting;
      sync();
    }).observe(card);
    new IntersectionObserver(function (entries) {
      formVisible = entries[0].isIntersecting;
      sync();
    }).observe(form);
  }

  /* ---------- Запуск ---------- */

  function init() {
    buildForm();

    // Черновик из прошлого раза
    var draft = App.store.get('draft', null);
    if (draft && typeof draft === 'object') {
      var base = defaultState();
      for (var k in base) if (Object.prototype.hasOwnProperty.call(draft, k)) base[k] = draft[k];
      state = base;
      if (!Array.isArray(state.features)) state.features = [];
      if (!Array.isArray(state.outputs)) state.outputs = DEFAULT_OUTPUTS.slice();
    }

    // ?id=... — открыть готовый промпт из базы
    var id = App.qs('id');
    var p = id && findPrompt(id);
    if (p) {
      state.template = p.id;
      applyTemplateDefaults(p);
    } else if (!findPrompt(state.template)) {
      state.template = UNIVERSAL;
    }

    writeForm();
    showTemplateInfo();
    update(false);

    form.addEventListener('input', function () { update(); });
    form.addEventListener('change', function (e) {
      if (e.target === templateSelect) {
        readForm();
        applyTemplateDefaults(findPrompt(state.template));
        writeForm();
        showTemplateInfo();
        setUrlTemplate(state.template);
      }
      if (e.target === subjectSelect && subjectSelect.value === OTHER) {
        subjectCustom.hidden = false;
        subjectCustom.focus();
      }
      update();
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    initActions();
    initJumpBar();
  }

  init();
})();
