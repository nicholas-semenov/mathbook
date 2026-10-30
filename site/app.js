/* Оболочка курса: манифест, роутер по hash, сайдбар, прогресс, темы, квизы. */
(function () {
  'use strict';

  // ─────────────────────── программа курса ───────────────────────
  // fx — пункты «Курса дифференциального и интегрального исчисления» Фихтенгольца (том 1)
  const MODULES = [
    {
      id: 'm0', num: '0', title: 'Вещественные числа',
      desc: 'Фундамент: почему рациональных чисел мало, как устроена числовая прямая и откуда берётся её «непрерывность».',
      fx: 'Введение, п. 1–21',
      lessons: [
        { id: 'm0-01', t: 'Зачем нужен анализ и как читать этот курс', fx: 'предисловие', min: 25 },
        { id: 'm0-02', t: 'Рациональные числа и их недостаточность', fx: 'п. 1–5', min: 35 },
        { id: 'm0-03', t: 'Сечения Дедекинда: строим вещественные числа', fx: 'п. 6–10', min: 45 },
        { id: 'm0-04', t: 'Точные границы множеств и арифметика вещественных чисел', fx: 'п. 11–17', min: 40 },
        { id: 'm0-05', t: 'Корни, степени и логарифмы', fx: 'п. 18–21', min: 35 },
      ],
    },
    {
      id: 'm1', num: 'I', title: 'Предел последовательности',
      desc: 'Главный инструмент анализа. Строгое ε-определение, арифметика пределов, монотонность и число e.',
      fx: 'Глава I, п. 22–42',
      lessons: [
        { id: 'm1-01', t: 'Варианта и её предел: изобретаем определение', fx: 'п. 22–25', min: 50 },
        { id: 'm1-02', t: 'Бесконечно малые и бесконечно большие', fx: 'п. 23–27', min: 35 },
        { id: 'm1-03', t: 'Арифметика пределов и переход к пределу в неравенствах', fx: 'п. 28–30', min: 45 },
        { id: 'm1-04', t: 'Неопределённые выражения и приёмы вычисления', fx: 'п. 31–33', min: 45 },
        { id: 'm1-05', t: 'Монотонные последовательности и число e', fx: 'п. 34–38', min: 50 },
        { id: 'm1-06', t: 'Принцип сходимости Коши. Лемма Больцано—Вейерштрасса', fx: 'п. 39–42', min: 50 },
      ],
    },
    {
      id: 'm2', num: 'II', title: 'Функция, предел, непрерывность',
      desc: 'Функции и их пределы, сравнение бесконечно малых, непрерывность и её глобальные свойства.',
      fx: 'Глава II, п. 43–89',
      lessons: [
        { id: 'm2-01', t: 'Понятие функции', fx: 'п. 43–51', min: 40 },
        { id: 'm2-02', t: 'Предел функции: определения Гейне и Коши', fx: 'п. 52–53, 58', min: 50 },
        { id: 'm2-03', t: 'Техника пределов и замечательные пределы', fx: 'п. 54–57, 77', min: 50 },
        { id: 'm2-04', t: 'Сравнение бесконечно малых: o-символика и эквивалентности', fx: 'п. 60–65', min: 45 },
        { id: 'm2-05', t: 'Непрерывность и классификация разрывов', fx: 'п. 66–75', min: 45 },
        { id: 'm2-06', t: 'Глобальные свойства непрерывных функций', fx: 'п. 80–85', min: 50 },
        { id: 'm2-07', t: 'Равномерная непрерывность. Теорема Кантора', fx: 'п. 86–89', min: 40 },
      ],
    },
    {
      id: 'm3', num: 'III', title: 'Производная и дифференциал',
      desc: 'Ядро курса: определение производной, вся таблица с выводами, правила дифференцирования, дифференциал.',
      fx: 'Глава III, п. 90–108, 115–122',
      lessons: [
        { id: 'm3-01', t: 'Изобретаем производную: скорость и касательная', fx: 'п. 90–92', min: 55 },
        { id: 'm3-02', t: 'Вычисляем производные: вся таблица с выводами', fx: 'п. 93–95', min: 60 },
        { id: 'm3-03', t: 'Правила дифференцирования: арифметика, обратная и сложная функции', fx: 'п. 96–99', min: 55 },
        { id: 'm3-04', t: 'Односторонние и бесконечные производные. Особые случаи', fx: 'п. 100–102', min: 35 },
        { id: 'm3-05', t: 'Дифференциал и линейное приближение', fx: 'п. 103–108', min: 50 },
        { id: 'm3-06', t: 'Производные и дифференциалы высших порядков', fx: 'п. 115–122', min: 45 },
      ],
    },
    {
      id: 'm4', num: 'IV', title: 'Основные теоремы и формула Тейлора',
      desc: 'Ферма, Ролль, Лагранж, Коши — теоремы о среднем значении — и вершина главы: формула Тейлора.',
      fx: 'Глава III, п. 109–114, 123–127',
      lessons: [
        { id: 'm4-01', t: 'Теоремы Ферма и Дарбу', fx: 'п. 109–110', min: 35 },
        { id: 'm4-02', t: 'Теорема Ролля и формула Лагранжа', fx: 'п. 111–113', min: 50 },
        { id: 'm4-03', t: 'Формула Коши — обобщённая теорема о среднем', fx: 'п. 114', min: 25 },
        { id: 'm4-04', t: 'Формула Тейлора с остатком в форме Пеано', fx: 'п. 123–125', min: 55 },
        { id: 'm4-05', t: 'Остаток Лагранжа. Разложения и приближённые вычисления', fx: 'п. 126–127', min: 50 },
      ],
    },
    {
      id: 'm5', num: 'V', title: 'Исследование функций',
      desc: 'Производная как рабочий инструмент: монотонность, экстремумы, выпуклость, асимптоты, Лопиталь, метод Ньютона.',
      fx: 'Глава IV, п. 131–158',
      lessons: [
        { id: 'm5-01', t: 'Монотонность и доказательство неравенств', fx: 'п. 131–133', min: 45 },
        { id: 'm5-02', t: 'Экстремумы: необходимые и достаточные условия', fx: 'п. 134–138', min: 55 },
        { id: 'm5-03', t: 'Наибольшие и наименьшие значения: задачи оптимизации', fx: 'п. 139–140', min: 45 },
        { id: 'm5-04', t: 'Выпуклость и неравенство Иенсена', fx: 'п. 141–145', min: 50 },
        { id: 'm5-05', t: 'Асимптоты и полное построение графика', fx: 'п. 146–149', min: 45 },
        { id: 'm5-06', t: 'Правило Лопиталя', fx: 'п. 150–152', min: 45 },
        { id: 'm5-07', t: 'Численное решение уравнений: хорды и метод Ньютона', fx: 'п. 153–158', min: 40 },
      ],
    },
    {
      id: 'm6', num: 'Q', title: 'Производные в количественных финансах',
      desc: 'Мост к профессии: лог-доходности и e, греки опционов, критерий Келли, Ньютон для implied vol и дорога к Ито.',
      fx: 'приложение к курсу',
      lessons: [
        { id: 'm6-01', t: 'Доходности, e и непрерывное начисление', fx: 'опирается на м. I–III', min: 40 },
        { id: 'm6-02', t: 'Греки: производная как чувствительность и Тейлор для P&L', fx: 'опирается на м. III–IV', min: 50 },
        { id: 'm6-03', t: 'Оптимизация: критерий Келли и implied volatility', fx: 'опирается на м. V', min: 45 },
        { id: 'm6-04', t: 'Куда дальше: интеграл, многомерье и лемма Ито', fx: 'тома 2–3 Фихтенгольца', min: 30 },
      ],
    },
  ];

  const ALL = [];
  MODULES.forEach(m => m.lessons.forEach(l => { l.mod = m; ALL.push(l); }));

  // ─────────────────────── состояние ───────────────────────
  function lsGet(k, def) {
    try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); }
    catch (e) { return def; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* приватный режим */ }
  }
  let done = lsGet('fx-done', {});

  // ─────────────────────── тема ───────────────────────
  const root = document.documentElement;
  const savedTheme = lsGet('fx-theme', null);
  if (savedTheme) root.setAttribute('data-theme', savedTheme);
  document.getElementById('themeBtn').addEventListener('click', () => {
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const cur = root.getAttribute('data-theme') || (sysDark ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    lsSet('fx-theme', next);
    if (window.VIZ) VIZ.rerenderAll();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (window.VIZ) VIZ.rerenderAll();
  });

  // ─────────────────────── сайдбар ───────────────────────
  const sidebar = document.getElementById('sidebar');
  function buildSidebar() {
    let h = '<a class="side-home" href="#home">⌂ Главная · программа курса</a>';
    for (const m of MODULES) {
      h += '<div class="mod" id="side-' + m.id + '">' +
        '<div class="mod-head"><span class="mod-num">' + m.num + '</span>' +
        '<span class="mod-title">' + m.title + '</span><span class="mod-fold">▸</span></div>' +
        '<ul class="mod-lessons">';
      m.lessons.forEach((l, i) => {
        h += '<li><a href="#' + l.id + '" data-id="' + l.id + '">' +
          '<span class="tick">' + (done[l.id] ? '✓' : '') + '</span>' +
          '<span>' + (i + 1) + '. ' + l.t + '</span></a></li>';
      });
      h += '</ul></div>';
    }
    sidebar.innerHTML = h;
    sidebar.querySelectorAll('.mod-head').forEach(head => {
      head.addEventListener('click', () => head.parentElement.classList.toggle('open'));
    });
  }
  buildSidebar();

  const menuBtn = document.getElementById('menuBtn');
  const scrim = document.getElementById('scrim');
  menuBtn.addEventListener('click', () => document.body.classList.toggle('nav-open'));
  scrim.addEventListener('click', () => document.body.classList.remove('nav-open'));
  sidebar.addEventListener('click', e => {
    if (e.target.closest('a')) document.body.classList.remove('nav-open');
  });

  // ─────────────────────── прогресс ───────────────────────
  function updateProgress() {
    const total = ALL.length;
    const n = ALL.filter(l => done[l.id]).length;
    document.getElementById('progressFill').style.width = (100 * n / total) + '%';
    document.getElementById('progressLabel').innerHTML =
      '<span class="words">пройдено </span>' + n + '/' + total;
    sidebar.querySelectorAll('a[data-id]').forEach(a => {
      a.querySelector('.tick').textContent = done[a.getAttribute('data-id')] ? '✓' : '';
    });
    for (const m of MODULES) {
      const card = document.querySelector('#card-' + m.id + ' .bar i');
      if (card) {
        const k = m.lessons.filter(l => done[l.id]).length;
        card.style.width = (100 * k / m.lessons.length) + '%';
      }
    }
  }

  // ─────────────────────── квизы ───────────────────────
  function mountQuizzes(rootEl) {
    rootEl.querySelectorAll('[data-quiz]').forEach(el => {
      let q;
      try { q = JSON.parse(el.getAttribute('data-quiz')); } catch (e) { return; }
      el.classList.add('quiz');
      const qd = document.createElement('div');
      qd.className = 'q';
      qd.innerHTML = q.q;
      el.appendChild(qd);
      const buttons = [];
      q.opts.forEach((opt, i) => {
        const b = document.createElement('button');
        b.className = 'opt';
        b.innerHTML = opt;
        b.addEventListener('click', () => {
          if (el.classList.contains('answered')) return;
          el.classList.add('answered');
          buttons[q.a].classList.add('correct');
          if (i !== q.a) b.classList.add('wrong');
        });
        buttons.push(b);
        el.appendChild(b);
      });
      if (q.why) {
        const w = document.createElement('div');
        w.className = 'why';
        w.innerHTML = q.why;
        el.appendChild(w);
      }
    });
  }

  // ─────────────────────── KaTeX ───────────────────────
  function renderMath(el) {
    if (window.renderMathInElement) {
      renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
      });
    }
  }

  // ─────────────────────── страницы ───────────────────────
  const view = document.getElementById('view');

  function homePage() {
    const totalMin = ALL.reduce((s, l) => s + l.min, 0);
    let h = '<div class="hero">' +
      '<div class="over">по Г. М. Фихтенгольцу · том 1 · с интерактивными визуализациями</div>' +
      '<h1>Дифференциальное исчисление — строго и наглядно</h1>' +
      '<p class="lead">Полный путь к производной: вещественные числа → пределы → непрерывность → производная → формула Тейлора → исследование функций. Каждый урок — определения, теоремы с доказательствами, интуиция в духе лучших матобъяснителей и упражнения. Финальный модуль переводит всё это на язык количественных финансов.</p>' +
      '<a class="cta" href="#m0-01">Начать с первого урока →</a>' +
      '</div>';
    h += '<div class="mod-grid">';
    for (const m of MODULES) {
      const k = m.lessons.filter(l => done[l.id]).length;
      h += '<a class="mod-card" id="card-' + m.id + '" href="#' + m.lessons[0].id + '">' +
        '<span class="mod-num">МОДУЛЬ ' + m.num + ' · ' + m.fx + '</span>' +
        '<span class="t">' + m.title + '</span>' +
        '<span class="d">' + m.desc + '</span>' +
        '<span class="meta">' + m.lessons.length + ' уроков · ~' + Math.round(m.lessons.reduce((s, l) => s + l.min, 0) / 60 * 10) / 10 + ' ч</span>' +
        '<span class="bar"><i style="width:' + (100 * k / m.lessons.length) + '%"></i></span>' +
        '</a>';
    }
    h += '</div>';
    h += '<hr><h2>Как устроен курс</h2>' +
      '<p>Структура и математическая строгость — из «Курса дифференциального и интегрального исчисления» Г. М. Фихтенгольца (ссылки на пункты книги — в шапке каждого урока). Манера объяснения — «изобретаем понятие сами»: сначала задача, из которой понятие родилось, затем честные попытки, тупики и починка идеи, и только потом отточенное определение и доказательства. Интерактивные графики можно крутить руками — это и есть главный способ подружить формулу с интуицией.</p>' +
      '<p>Всего ' + ALL.length + ' уроков, суммарно ~' + Math.round(totalMin / 60) + ' часов. Прогресс сохраняется в этом браузере. Условные обозначения: <b>определения</b> — синяя рамка, <b>теоремы</b> — золотая, <b>интуиция</b> — голубой фон, <b>примеры</b> — зелёная, <b>квант-мостики</b> — оранжевая.</p>';
    view.innerHTML = h;
  }

  function lessonPage(id) {
    const idx = ALL.findIndex(l => l.id === id);
    const l = ALL[idx];
    const html = window.COURSE_CONTENT[id];
    const m = l.mod;
    const lessonNum = m.lessons.indexOf(l) + 1;
    let h = '<article>' +
      '<div class="lesson-eyebrow">' +
      '<span>модуль ' + m.num + ' · урок ' + lessonNum + '/' + m.lessons.length + '</span>' +
      '<span class="fx">Фихтенгольц, ' + l.fx + '</span>' +
      '<span>≈ ' + l.min + ' мин</span>' +
      '</div>' +
      '<h1>' + l.t + '</h1>' +
      (html || '<p>Урок готовится.</p>') +
      '</article>';
    h += '<button class="done-btn' + (done[id] ? ' on' : '') + '" id="doneBtn">' +
      (done[id] ? '✓ Урок пройден' : 'Отметить урок пройденным') + '</button>';
    h += '<div class="lesson-nav">';
    if (idx > 0) {
      h += '<a class="prev" href="#' + ALL[idx - 1].id + '"><span class="dir">← назад</span><span class="t">' + ALL[idx - 1].t + '</span></a>';
    }
    if (idx < ALL.length - 1) {
      h += '<a class="next" href="#' + ALL[idx + 1].id + '"><span class="dir">дальше →</span><span class="t">' + ALL[idx + 1].t + '</span></a>';
    } else {
      h += '<a class="next" href="#home"><span class="dir">финиш</span><span class="t">Вернуться к программе курса</span></a>';
    }
    h += '</div>';
    view.innerHTML = h;
    document.getElementById('doneBtn').addEventListener('click', () => {
      done[id] = !done[id];
      lsSet('fx-done', done);
      const b = document.getElementById('doneBtn');
      b.classList.toggle('on', !!done[id]);
      b.textContent = done[id] ? '✓ Урок пройден' : 'Отметить урок пройденным';
      updateProgress();
    });
    renderMath(view);
    mountQuizzes(view);
    if (window.VIZ) VIZ.mountAll(view);
  }

  function route() {
    const hash = (location.hash || '#home').slice(1);
    document.body.classList.remove('nav-open');
    sidebar.querySelectorAll('a[data-id]').forEach(a => a.classList.remove('active'));
    if (hash === 'home' || !ALL.some(l => l.id === hash)) {
      homePage();
      renderMath(view);
      updateProgress();
      window.scrollTo(0, 0);
      return;
    }
    lessonPage(hash);
    const link = sidebar.querySelector('a[data-id="' + hash + '"]');
    if (link) {
      link.classList.add('active');
      const mod = link.closest('.mod');
      if (mod) mod.classList.add('open');
    }
    updateProgress();
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  route();
})();
