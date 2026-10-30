/* Движок интерактивных визуализаций курса.
   Виджет размечается так:
     <figure class="viz">
       <div data-viz="secant" data-opts='{"f":"sin(x)","a":1,"x":[-0.5,4],"y":[-1.5,1.5]}'></div>
       <figcaption>Подпись.</figcaption>
     </figure>
   Все цвета берутся из CSS-переменных, виджеты перерисовываются при смене темы и ресайзе. */
(function () {
  'use strict';

  const mounted = []; // { render: fn }

  // ───────────────────────── утилиты ─────────────────────────
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  const palette = () => ({
    c1: cssVar('--c1'), c2: cssVar('--c2'), c3: cssVar('--c3'),
    c4: cssVar('--c4'), c5: cssVar('--c5'),
    ink: cssVar('--ink'), muted: cssVar('--muted'), faint: cssVar('--faint'),
    grid: cssVar('--grid'), axis: cssVar('--axis'), accent: cssVar('--accent'),
  });
  const COLORKEYS = ['c1', 'c2', 'c3', 'c4', 'c5'];

  function compile(expr) {
    // sin(x) → Math.sin(x) и т.п.; ln = натуральный логарифм
    return new Function('x', 'n', 't',
      'const {sin,cos,tan,exp,sqrt,abs,atan,asin,acos,sinh,cosh,tanh,sign,floor,ceil,round,min,max,pow,PI,E} = Math;' +
      'const ln = Math.log, log = Math.log; const fact = m => { let r = 1; for (let i = 2; i <= m; i++) r *= i; return r; };' +
      'return (' + expr + ');');
  }
  function safeEval(fn, x) {
    try { const y = fn(x, x, x); return (typeof y === 'number' && isFinite(y)) ? y : NaN; }
    catch (e) { return NaN; }
  }
  function numDeriv(fn, x) {
    const h = 1e-5 * (1 + Math.abs(x));
    return (safeEval(fn, x + h) - safeEval(fn, x - h)) / (2 * h);
  }
  function fmt(v, d) {
    if (!isFinite(v)) return '—';
    d = (d === undefined) ? 4 : d;
    const a = Math.abs(v);
    if (a !== 0 && (a < 1e-4 || a >= 1e6)) return v.toExponential(2);
    return String(parseFloat(v.toFixed(d)));
  }

  // ───────────────────────── плоттер ─────────────────────────
  function makePlot(host, opts) {
    const canvas = document.createElement('canvas');
    host.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const P = {
      canvas, ctx,
      xmin: opts.x ? opts.x[0] : -5, xmax: opts.x ? opts.x[1] : 5,
      ymin: opts.y ? opts.y[0] : -3, ymax: opts.y ? opts.y[1] : 3,
      padL: 8, padR: 8, padT: 8, padB: 8,
      W: 0, H: 0,
      height: opts.height || 340,
    };
    P.sx = x => P.padL + (x - P.xmin) / (P.xmax - P.xmin) * (P.W - P.padL - P.padR);
    P.sy = y => P.H - P.padB - (y - P.ymin) / (P.ymax - P.ymin) * (P.H - P.padT - P.padB);
    P.ix = sx => P.xmin + (sx - P.padL) / (P.W - P.padL - P.padR) * (P.xmax - P.xmin);

    P.begin = function () {
      const dpr = window.devicePixelRatio || 1;
      const w = host.clientWidth || 600;
      const h = Math.min(P.height, Math.max(220, w * 0.55));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      P.W = w; P.H = h;
      ctx.clearRect(0, 0, w, h);
      P.col = palette();
    };
    function niceStep(span, target) {
      const raw = span / target;
      const p = Math.pow(10, Math.floor(Math.log10(raw)));
      for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * p) return m * p;
      return 10 * p;
    }
    P.grid = function () {
      const c = P.col;
      ctx.save();
      ctx.lineWidth = 1;
      const tx = niceStep(P.xmax - P.xmin, 10), ty = niceStep(P.ymax - P.ymin, 7);
      ctx.strokeStyle = c.grid;
      ctx.beginPath();
      for (let x = Math.ceil(P.xmin / tx) * tx; x <= P.xmax + 1e-9; x += tx) {
        ctx.moveTo(P.sx(x), P.sy(P.ymin)); ctx.lineTo(P.sx(x), P.sy(P.ymax));
      }
      for (let y = Math.ceil(P.ymin / ty) * ty; y <= P.ymax + 1e-9; y += ty) {
        ctx.moveTo(P.sx(P.xmin), P.sy(y)); ctx.lineTo(P.sx(P.xmax), P.sy(y));
      }
      ctx.stroke();
      // оси
      ctx.strokeStyle = c.axis;
      ctx.beginPath();
      const y0 = (P.ymin <= 0 && P.ymax >= 0) ? 0 : null;
      const x0 = (P.xmin <= 0 && P.xmax >= 0) ? 0 : null;
      if (y0 !== null) { ctx.moveTo(P.sx(P.xmin), P.sy(0)); ctx.lineTo(P.sx(P.xmax), P.sy(0)); }
      if (x0 !== null) { ctx.moveTo(P.sx(0), P.sy(P.ymin)); ctx.lineTo(P.sx(0), P.sy(P.ymax)); }
      ctx.stroke();
      // подписи делений
      ctx.fillStyle = c.muted;
      ctx.font = '10.5px JetBrains Mono, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const ybase = (y0 !== null) ? P.sy(0) + 4 : P.H - 16;
      for (let x = Math.ceil(P.xmin / tx) * tx; x <= P.xmax + 1e-9; x += tx) {
        if (Math.abs(x) < tx / 2 && x0 !== null) continue;
        ctx.fillText(fmt(x, 3), P.sx(x), Math.min(ybase, P.H - 14));
      }
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const xbase = (x0 !== null) ? P.sx(0) + 5 : 6;
      for (let y = Math.ceil(P.ymin / ty) * ty; y <= P.ymax + 1e-9; y += ty) {
        if (Math.abs(y) < ty / 2) continue;
        ctx.fillText(fmt(y, 3), Math.min(xbase, P.W - 34), P.sy(y));
      }
      ctx.restore();
    };
    P.fn = function (f, color, o) {
      o = o || {};
      const n = o.samples || 500;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = o.w || 2;
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath();
      let pen = false;
      const lim = (P.ymax - P.ymin) * 4;
      let prevY = NaN;
      const from = (o.from !== undefined) ? o.from : P.xmin;
      const to = (o.to !== undefined) ? o.to : P.xmax;
      for (let i = 0; i <= n; i++) {
        const x = from + (to - from) * i / n;
        const y = safeEval(f, x);
        if (isNaN(y) || Math.abs(y - (isNaN(prevY) ? y : prevY)) > lim) { pen = false; prevY = y; continue; }
        const cy = Math.max(P.ymin - lim, Math.min(P.ymax + lim, y));
        if (!pen) { ctx.moveTo(P.sx(x), P.sy(cy)); pen = true; }
        else ctx.lineTo(P.sx(x), P.sy(cy));
        prevY = y;
      }
      ctx.stroke();
      ctx.restore();
    };
    P.seg = function (x1, y1, x2, y2, color, o) {
      o = o || {};
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = o.w || 2;
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath(); ctx.moveTo(P.sx(x1), P.sy(y1)); ctx.lineTo(P.sx(x2), P.sy(y2)); ctx.stroke();
      ctx.restore();
    };
    P.lineThrough = function (x0, y0, slope, color, o) {
      if (!isFinite(slope)) { P.seg(x0, P.ymin, x0, P.ymax, color, o); return; }
      P.seg(P.xmin, y0 + slope * (P.xmin - x0), P.xmax, y0 + slope * (P.xmax - x0), color, o);
    };
    P.dot = function (x, y, color, r, hollow) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(P.sx(x), P.sy(y), r || 4.5, 0, Math.PI * 2);
      if (hollow) {
        ctx.fillStyle = cssVar('--surface'); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.stroke();
      } else { ctx.fillStyle = color; ctx.fill(); }
      ctx.restore();
    };
    P.hband = function (y1, y2, color) {
      ctx.save(); ctx.globalAlpha = 0.13; ctx.fillStyle = color;
      ctx.fillRect(P.sx(P.xmin), P.sy(Math.max(y1, y2)), P.sx(P.xmax) - P.sx(P.xmin), Math.abs(P.sy(y1) - P.sy(y2)));
      ctx.restore();
    };
    P.vband = function (x1, x2, color) {
      ctx.save(); ctx.globalAlpha = 0.13; ctx.fillStyle = color;
      ctx.fillRect(P.sx(Math.min(x1, x2)), P.sy(P.ymax), Math.abs(P.sx(x2) - P.sx(x1)), P.sy(P.ymin) - P.sy(P.ymax));
      ctx.restore();
    };
    P.label = function (x, y, text, color, o) {
      o = o || {};
      ctx.save();
      ctx.font = (o.size || 12) + 'px JetBrains Mono, monospace';
      ctx.fillStyle = color || P.col.muted;
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = o.base || 'bottom';
      ctx.fillText(text, P.sx(x) + (o.dx || 0), P.sy(y) + (o.dy || 0));
      ctx.restore();
    };
    P.legend = function (items) {
      ctx.save();
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.textBaseline = 'middle';
      let xx = P.padL + 8, yy = P.padT + 12;
      for (const it of items) {
        ctx.strokeStyle = it.color; ctx.lineWidth = 2.5;
        if (it.dash) ctx.setLineDash(it.dash); else ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 20, yy); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = P.col.ink;
        ctx.fillText(it.label, xx + 26, yy + 0.5);
        yy += 18;
      }
      ctx.restore();
    };
    return P;
  }

  // ─────────────────── элементы управления ───────────────────
  function controlsBox(host) {
    const d = document.createElement('div');
    d.className = 'viz-controls';
    host.appendChild(d);
    return d;
  }
  function readoutBox(host) {
    const d = document.createElement('div');
    d.className = 'viz-readout';
    host.appendChild(d);
    return d;
  }
  function slider(box, labelHtml, min, max, step, value, onchange, fmtFn) {
    const lab = document.createElement('label');
    const name = document.createElement('span');
    name.innerHTML = labelHtml;
    const input = document.createElement('input');
    input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = value;
    const val = document.createElement('span');
    val.className = 'val';
    const upd = () => { val.textContent = (fmtFn || (v => fmt(v)))(parseFloat(input.value)); };
    input.addEventListener('input', () => { upd(); onchange(parseFloat(input.value)); });
    lab.appendChild(name); lab.appendChild(input); lab.appendChild(val);
    box.appendChild(lab);
    upd();
    return input;
  }
  function button(box, text, onclick) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = text;
    b.addEventListener('click', onclick);
    box.appendChild(b);
    return b;
  }
  function checkbox(box, labelHtml, checked, onchange) {
    const lab = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox'; input.checked = checked;
    const name = document.createElement('span');
    name.innerHTML = labelHtml;
    input.addEventListener('change', () => onchange(input.checked));
    lab.appendChild(input); lab.appendChild(name);
    box.appendChild(lab);
    return input;
  }

  // ───────────────────────── виджеты ─────────────────────────
  const widgets = {};

  // Статический график: fns, points, segs, vlines, hlines
  widgets.plot = function (el, o) {
    const P = makePlot(el, o);
    return function render() {
      P.begin(); P.grid();
      const c = P.col;
      const leg = [];
      (o.fns || []).forEach((s, i) => {
        const col = c[s.c || COLORKEYS[i % 5]];
        P.fn(compile(s.f), col, { dash: s.dash, w: s.w, from: s.from, to: s.to });
        if (s.label) leg.push({ label: s.label, color: col, dash: s.dash });
      });
      (o.segs || []).forEach(s => P.seg(s[0], s[1], s[2], s[3], c[s[4] || 'c2'], { dash: s[5] }));
      (o.vlines || []).forEach(v => P.seg(v, P.ymin, v, P.ymax, c.faint, { dash: [4, 4], w: 1.5 }));
      (o.hlines || []).forEach(v => P.seg(P.xmin, v, P.xmax, v, c.faint, { dash: [4, 4], w: 1.5 }));
      (o.points || []).forEach(p => {
        P.dot(p[0], p[1], c[p[3] || 'c1'], 4.5, p[4] === 'hollow');
        if (p[2]) P.label(p[0], p[1], p[2], c.ink, { dx: 8, dy: -6 });
      });
      if (leg.length > 1 || o.legend) P.legend(leg);
    };
  };

  // Секущая → касательная
  widgets.secant = function (el, o) {
    const f = compile(o.f);
    const P = makePlot(el, o);
    const box = controlsBox(el);
    const out = readoutBox(el);
    const hr = o.h || [0.001, 2, 1.2];
    let h = hr[2];
    let showTan = o.tangent !== false;
    function render() {
      P.begin(); P.grid();
      const c = P.col;
      const a = o.a, fa = safeEval(f, a), fb = safeEval(f, a + h);
      const slope = (fb - fa) / h;
      const d = numDeriv(f, a);
      P.fn(f, c.c1);
      if (showTan) P.lineThrough(a, fa, d, c.c3, { dash: [6, 5], w: 2 });
      P.lineThrough(a, fa, slope, c.c2, { w: 2 });
      P.seg(a, fa, a + h, fa, c.muted, { dash: [3, 3], w: 1.5 });
      P.seg(a + h, fa, a + h, fb, c.muted, { dash: [3, 3], w: 1.5 });
      P.dot(a, fa, c.c1);
      P.dot(a + h, fb, c.c2);
      P.label(a, fa, 'x₀', c.ink, { dy: 16, dx: -4 });
      P.label(a + h, fb, 'x₀+Δx', c.ink, { dx: 8, dy: -8 });
      const items = [{ label: 'секущая', color: c.c2 }];
      if (showTan) items.push({ label: 'касательная', color: c.c3, dash: [6, 5] });
      P.legend(items);
      out.innerHTML =
        'Δx = <b>' + fmt(h) + '</b> &nbsp;·&nbsp; Δf/Δx = <b>' + fmt(slope) + '</b>' +
        (showTan ? ' &nbsp;·&nbsp; f′(x₀) = <b>' + fmt(d) + '</b> &nbsp;·&nbsp; разница: <b>' + fmt(Math.abs(slope - d)) + '</b>' : '');
    }
    slider(box, 'шаг Δx', hr[0], hr[1], (hr[1] - hr[0]) / 400, h, v => { h = v; render(); });
    if (o.tangent !== false) checkbox(box, 'показать касательную', showTan, v => { showTan = v; render(); });
    return render;
  };

  // Микроскоп: локальная линейность
  widgets.zoom = function (el, o) {
    const f = compile(o.f);
    const x0 = o.x0, y0 = safeEval(f, x0);
    const span0 = o.span || 4;
    const P = makePlot(el, { height: o.height || 320 });
    const box = controlsBox(el);
    const out = readoutBox(el);
    let k = 0;
    function render() {
      const half = span0 / 2 * Math.pow(2, -k);
      P.xmin = x0 - half; P.xmax = x0 + half;
      const yspan = Math.max(Math.abs(safeEval(f, x0 + half) - y0), Math.abs(safeEval(f, x0 - half) - y0), half * 0.3) * 1.6;
      P.ymin = y0 - yspan; P.ymax = y0 + yspan;
      P.begin(); P.grid();
      const c = P.col;
      P.fn(f, c.c1, { samples: 600 });
      if (o.showTangent) P.lineThrough(x0, y0, numDeriv(f, x0), c.c3, { dash: [6, 5] });
      P.dot(x0, y0, c.c2);
      const sl = (safeEval(f, x0 + half * 0.5) - safeEval(f, x0 - half * 0.5)) / half;
      out.innerHTML = 'ширина окна: <b>' + fmt(2 * half, 6) + '</b> &nbsp;·&nbsp; наклон на этом окне ≈ <b>' + fmt(sl) + '</b>' +
        ' &nbsp;·&nbsp; f′(' + fmt(x0, 3) + ') = <b>' + fmt(numDeriv(f, x0)) + '</b>';
    }
    slider(box, 'увеличение, 2<sup>k</sup>', 0, o.kmax || 12, 1, 0, v => { k = v; render(); }, v => '×' + Math.pow(2, v));
    return render;
  };

  // Предел последовательности: точки, полоса L±ε
  widgets.seqlim = function (el, o) {
    const seqs = (o.seqs || [{ f: o.seq, label: o.label, c: 'c1' }]).map((s, i) => ({
      fn: compile(s.f), label: s.label, c: s.c || COLORKEYS[i % 5], L: (s.L !== undefined) ? s.L : o.L,
    }));
    const N = o.n || 40;
    const er = o.eps || [0.01, 1, 0.35];
    let eps = er[2];
    const P = makePlot(el, { x: [0, N + 1], y: o.y, height: o.height || 300 });
    if (!o.y) {
      let lo = Infinity, hi = -Infinity;
      seqs.forEach(s => { for (let n = 1; n <= N; n++) { const v = safeEval(s.fn, n); if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } } });
      const m = (hi - lo) * 0.2 + 0.1;
      P.ymin = lo - m; P.ymax = hi + m;
    }
    const box = controlsBox(el);
    const out = readoutBox(el);
    function render() {
      P.begin(); P.grid();
      const c = P.col;
      const L0 = seqs[0].L;
      if (L0 !== undefined && L0 !== null) {
        P.hband(L0 - eps, L0 + eps, c.c2);
        P.seg(0, L0, N + 1, L0, c.c2, { dash: [6, 4], w: 1.5 });
        P.label(N + 0.6, L0, 'L', c.c2, { align: 'right', dy: -4 });
      }
      let lastBad = 0;
      seqs.forEach(s => {
        for (let n = 1; n <= N; n++) {
          const v = safeEval(s.fn, n);
          const inside = (s.L !== undefined && s.L !== null) && Math.abs(v - s.L) < eps;
          if ((s.L !== undefined && s.L !== null) && !inside) lastBad = Math.max(lastBad, n);
          P.dot(n, v, c[s.c], 3.4, !inside && (s.L !== undefined && s.L !== null));
        }
      });
      if (seqs.length > 1) P.legend(seqs.filter(s => s.label).map(s => ({ label: s.label, color: c[s.c] })));
      if (L0 !== undefined && L0 !== null) {
        if (lastBad >= 1 && lastBad < N) {
          P.seg(lastBad + 0.5, P.ymin, lastBad + 0.5, P.ymax, c.c4, { dash: [4, 4], w: 1.5 });
          P.label(lastBad + 0.9, P.ymax - (P.ymax - P.ymin) * 0.06, 'N = ' + lastBad, c.c4, { base: 'top' });
        }
        out.innerHTML = 'ε = <b>' + fmt(eps) + '</b> &nbsp;·&nbsp; ' +
          (lastBad < N
            ? 'начиная с номера <b>N = ' + (lastBad + 1) + '</b> все точки внутри полосы L±ε'
            : 'на первых ' + N + ' членах полоса ещё не «поймала» хвост — уменьшите ε или это расходящаяся последовательность');
      }
    }
    slider(box, 'ε', er[0], er[1], (er[1] - er[0]) / 300, eps, v => { eps = v; render(); });
    return render;
  };

  // ε–δ определение предела функции
  widgets.epsdelta = function (el, o) {
    const f = compile(o.f);
    const P = makePlot(el, o);
    const box = controlsBox(el);
    const out = readoutBox(el);
    const er = o.eps || [0.02, 1, 0.5];
    let eps = er[2];
    const a = o.a, L = (o.L !== undefined) ? o.L : safeEval(f, o.a);
    function findDelta() {
      let d = Math.min(P.xmax - a, a - P.xmin) * 0.95;
      const ok = dd => {
        for (let i = 0; i <= 300; i++) {
          const x = a - dd + (2 * dd) * i / 300;
          if (Math.abs(x - a) < 1e-12) continue;
          const y = safeEval(f, x);
          if (isNaN(y) || Math.abs(y - L) >= eps) return false;
        }
        return true;
      };
      if (ok(d)) return d;
      let lo = 0, hi = d;
      for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
      return lo;
    }
    function render() {
      P.begin(); P.grid();
      const c = P.col;
      const delta = findDelta();
      P.hband(L - eps, L + eps, c.c2);
      P.vband(a - delta, a + delta, c.c1);
      P.fn(f, c.c1);
      P.seg(P.xmin, L, P.xmax, L, c.c2, { dash: [6, 4], w: 1.5 });
      P.seg(a, P.ymin, a, P.ymax, c.faint, { dash: [4, 4], w: 1.5 });
      P.dot(a, L, c.c2, 4.5, true);
      P.label(a, P.ymin, 'a', c.ink, { dy: -6, dx: 4 });
      P.label(P.xmin, L, 'L', c.c2, { dx: 6, dy: -5 });
      out.innerHTML = 'ε = <b>' + fmt(eps) + '</b> &nbsp;⇒&nbsp; подходит δ = <b>' + fmt(delta) + '</b>' +
        ' : из |x−a|&lt;δ следует |f(x)−L|&lt;ε';
    }
    slider(box, 'ε', er[0], er[1], (er[1] - er[0]) / 300, eps, v => { eps = v; render(); });
    return render;
  };

  // Касательная с бегающей точкой + график производной
  widgets.tangent = function (el, o) {
    const f = compile(o.f);
    const P = makePlot(el, o);
    const box = controlsBox(el);
    const out = readoutBox(el);
    const xr = o.x0 || [P.xmin + 0.3, P.xmax - 0.3, (P.xmin + P.xmax) / 2];
    let x0 = xr[2];
    let showD = !!o.showDeriv;
    function render() {
      P.begin(); P.grid();
      const c = P.col;
      P.fn(f, c.c1);
      const y0 = safeEval(f, x0), d = numDeriv(f, x0);
      if (showD) {
        P.fn(x => numDeriv(f, x), c.c2, { dash: [5, 4] });
        P.dot(x0, d, c.c2);
      }
      P.lineThrough(x0, y0, d, c.c3);
      P.dot(x0, y0, c.c1);
      const leg = [{ label: 'f(x)', color: c.c1 }, { label: 'касательная', color: c.c3 }];
      if (showD) leg.push({ label: 'f′(x)', color: c.c2, dash: [5, 4] });
      P.legend(leg);
      out.innerHTML = 'x₀ = <b>' + fmt(x0, 3) + '</b> &nbsp;·&nbsp; f(x₀) = <b>' + fmt(y0) + '</b> &nbsp;·&nbsp; наклон f′(x₀) = <b>' + fmt(d) + '</b>';
    }
    slider(box, 'x₀', xr[0], xr[1], (xr[1] - xr[0]) / 300, x0, v => { x0 = v; render(); });
    checkbox(box, 'показать график f′(x)', showD, v => { showD = v; render(); });
    return render;
  };

  // Многочлены Тейлора: ak — коэффициент при x^k ряда в нуле
  function factorial(m) { let r = 1; for (let i = 2; i <= m; i++) r *= i; return r; }
  const TAYLOR = {
    sin: { f: 'sin(x)', ak: k => (k % 2 === 1 ? Math.pow(-1, (k - 1) / 2) / factorial(k) : 0), name: 'sin x' },
    cos: { f: 'cos(x)', ak: k => (k % 2 === 0 ? Math.pow(-1, k / 2) / factorial(k) : 0), name: 'cos x' },
    exp: { f: 'exp(x)', ak: k => 1 / factorial(k), name: 'eˣ' },
    ln1p: { f: 'ln(1+x)', ak: k => (k === 0 ? 0 : Math.pow(-1, k - 1) / k), name: 'ln(1+x)' },
    geom: { f: '1/(1-x)', ak: () => 1, name: '1/(1−x)' },
    atan: { f: 'atan(x)', ak: k => (k % 2 === 1 ? Math.pow(-1, (k - 1) / 2) / k : 0), name: 'arctg x' },
  };
  widgets.taylor = function (el, o) {
    const spec = TAYLOR[o.fn] || TAYLOR.sin;
    const f = compile(spec.f);
    const P = makePlot(el, o);
    const box = controlsBox(el);
    const out = readoutBox(el);
    let n = (o.n0 !== undefined) ? o.n0 : 1;
    const nmax = o.nmax || 11;
    function tval(x) {
      let s = 0;
      for (let k = 0; k <= n; k++) s += spec.ak(k) * Math.pow(x, k);
      return s;
    }
    function render() {
      P.begin(); P.grid();
      const c = P.col;
      P.fn(f, c.c1);
      P.fn(x => tval(x), c.c2, { dash: [6, 4] });
      P.dot(0, safeEval(f, 0), c.c3);
      P.legend([{ label: spec.name, color: c.c1 }, { label: 'T' + n + '(x)', color: c.c2, dash: [6, 4] }]);
      out.innerHTML = 'степень многочлена Тейлора: <b>n = ' + n + '</b> (разложение в точке a = 0)';
    }
    slider(box, 'степень n', 0, nmax, 1, n, v => { n = v; render(); }, v => 'n = ' + v);
    return render;
  };

  // Метод Ньютона
  widgets.newton = function (el, o) {
    const f = compile(o.f);
    const df = o.df ? compile(o.df) : null;
    const P = makePlot(el, o);
    const box = controlsBox(el);
    const out = readoutBox(el);
    let steps = o.steps0 !== undefined ? o.steps0 : 0;
    const maxSteps = o.steps || 6;
    function iterate() {
      const xs = [o.x0];
      for (let i = 0; i < maxSteps; i++) {
        const x = xs[xs.length - 1];
        const d = df ? safeEval(df, x) : numDeriv(f, x);
        if (!isFinite(d) || d === 0) break;
        xs.push(x - safeEval(f, x) / d);
      }
      return xs;
    }
    function render() {
      P.begin(); P.grid();
      const c = P.col;
      P.fn(f, c.c1);
      const xs = iterate();
      for (let i = 0; i < Math.min(steps, xs.length - 1); i++) {
        const x = xs[i], y = safeEval(f, x);
        P.seg(x, 0, x, y, c.muted, { dash: [3, 3], w: 1.2 });
        P.seg(x, y, xs[i + 1], 0, c.c2, { w: 1.8 });
        P.dot(x, y, c.c2, 3.5);
        P.dot(xs[i + 1], 0, c.c3, 3.5);
      }
      P.dot(xs[0], 0, c.c4, 4.5);
      P.label(xs[0], 0, 'x₀', c.c4, { dy: 16 });
      let t = '';
      for (let i = 0; i <= Math.min(steps, xs.length - 1); i++) t += 'x<sub>' + i + '</sub> = <b>' + fmt(xs[i], 8) + '</b> &nbsp; f = ' + fmt(safeEval(f, xs[i]), 8) + '<br>';
      out.innerHTML = t;
    }
    slider(box, 'шагов метода', 0, maxSteps, 1, steps, v => { steps = v; render(); }, v => String(v));
    return render;
  };

  // Деление отрезка пополам (Больцано)
  widgets.bisect = function (el, o) {
    const f = compile(o.f);
    const P = makePlot(el, o);
    const box = controlsBox(el);
    const out = readoutBox(el);
    let steps = 0;
    const maxSteps = o.steps || 10;
    function render() {
      P.begin(); P.grid();
      const c = P.col;
      let a = o.a, b = o.b;
      for (let i = 0; i < steps; i++) {
        const m = (a + b) / 2;
        if (safeEval(f, a) * safeEval(f, m) <= 0) b = m; else a = m;
      }
      P.vband(a, b, c.c3);
      P.fn(f, c.c1);
      P.dot(a, 0, c.c2, 4); P.dot(b, 0, c.c2, 4);
      P.label(a, 0, 'a' + (steps ? '′' : ''), c.c2, { dy: 16 });
      P.label(b, 0, 'b' + (steps ? '′' : ''), c.c2, { dy: 16, dx: -8 });
      out.innerHTML = 'шаг <b>' + steps + '</b> &nbsp;·&nbsp; отрезок [' + fmt(a, 6) + '; ' + fmt(b, 6) + '] &nbsp;·&nbsp; длина = <b>' + fmt(b - a, 6) + '</b>';
    }
    slider(box, 'делений', 0, maxSteps, 1, 0, v => { steps = v; render(); }, v => String(v));
    return render;
  };

  // Выпуклость: хорда над графиком
  widgets.convex = function (el, o) {
    const f = compile(o.f);
    const P = makePlot(el, o);
    const box = controlsBox(el);
    const out = readoutBox(el);
    let x1 = o.x1 !== undefined ? o.x1 : P.xmin + (P.xmax - P.xmin) * 0.2;
    let x2 = o.x2 !== undefined ? o.x2 : P.xmin + (P.xmax - P.xmin) * 0.8;
    let t = 0.5;
    function render() {
      P.begin(); P.grid();
      const c = P.col;
      const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
      const y1 = safeEval(f, lo), y2 = safeEval(f, hi);
      // заливка между хордой и графиком
      P.ctx.save();
      P.ctx.globalAlpha = 0.12; P.ctx.fillStyle = c.c3;
      P.ctx.beginPath();
      P.ctx.moveTo(P.sx(lo), P.sy(y1));
      for (let i = 0; i <= 120; i++) { const x = lo + (hi - lo) * i / 120; P.ctx.lineTo(P.sx(x), P.sy(safeEval(f, x))); }
      P.ctx.lineTo(P.sx(hi), P.sy(y2));
      P.ctx.closePath(); P.ctx.fill();
      P.ctx.restore();
      P.fn(f, c.c1);
      P.seg(lo, y1, hi, y2, c.c2);
      const xm = lo + t * (hi - lo);
      const chordY = y1 + t * (y2 - y1);
      P.seg(xm, safeEval(f, xm), xm, chordY, c.c4, { dash: [4, 3], w: 1.6 });
      P.dot(lo, y1, c.c2); P.dot(hi, y2, c.c2);
      P.dot(xm, safeEval(f, xm), c.c1, 4);
      P.dot(xm, chordY, c.c2, 4, true);
      out.innerHTML = 'f(точки на дуге) = <b>' + fmt(safeEval(f, xm)) + '</b> &nbsp;·&nbsp; значение на хорде = <b>' + fmt(chordY) + '</b>';
    }
    slider(box, 'x₁', P.xmin, P.xmax, (P.xmax - P.xmin) / 200, x1, v => { x1 = v; render(); }, v => fmt(v, 2));
    slider(box, 'x₂', P.xmin, P.xmax, (P.xmax - P.xmin) / 200, x2, v => { x2 = v; render(); }, v => fmt(v, 2));
    slider(box, 'λ (точка между)', 0, 1, 0.005, t, v => { t = v; render(); }, v => fmt(v, 2));
    return render;
  };

  // Случайные траектории: броуновское движение / GBM
  function mulberry(seed) {
    let s = seed >>> 0;
    return function () {
      s += 0x6D2B79F5;
      let z = s;
      z = Math.imul(z ^ (z >>> 15), z | 1);
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  }
  widgets.walk = function (el, o) {
    const P = makePlot(el, { height: o.height || 330 });
    const box = controlsBox(el);
    const out = readoutBox(el);
    const kind = o.kind || 'gbm';
    const Tn = o.steps || 250, T = o.T || 1;
    const mu = o.mu !== undefined ? o.mu : 0.08, sig = o.sigma !== undefined ? o.sigma : 0.25;
    const npaths = o.paths || 24;
    let seed = o.seed || 7;
    function gauss(rnd) {
      let u = 0, v = 0;
      while (u === 0) u = rnd();
      while (v === 0) v = rnd();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    function render() {
      const rnd = mulberry(seed);
      const dt = T / Tn;
      const paths = [];
      let lo = Infinity, hi = -Infinity;
      for (let p = 0; p < npaths; p++) {
        const ys = [kind === 'gbm' ? (o.s0 || 100) : 0];
        for (let i = 1; i <= Tn; i++) {
          const z = gauss(rnd);
          if (kind === 'gbm') ys.push(ys[i - 1] * Math.exp((mu - sig * sig / 2) * dt + sig * Math.sqrt(dt) * z));
          else ys.push(ys[i - 1] + Math.sqrt(dt) * z);
        }
        paths.push(ys);
        for (const y of ys) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
      }
      P.xmin = 0; P.xmax = T;
      const m = (hi - lo) * 0.08;
      P.ymin = lo - m; P.ymax = hi + m;
      P.begin(); P.grid();
      const c = P.col;
      P.ctx.save();
      P.ctx.globalAlpha = 0.45;
      paths.forEach(ys => {
        P.ctx.strokeStyle = c.c1; P.ctx.lineWidth = 1.2;
        P.ctx.beginPath();
        ys.forEach((y, i) => { const sx = P.sx(i * dt), sy = P.sy(y); if (i === 0) P.ctx.moveTo(sx, sy); else P.ctx.lineTo(sx, sy); });
        P.ctx.stroke();
      });
      P.ctx.restore();
      if (kind === 'gbm') {
        P.fn(x => (o.s0 || 100) * Math.exp(mu * x), c.c2, { dash: [6, 4], w: 2.2 });
        P.legend([{ label: 'траектории S(t)', color: c.c1 }, { label: 'E[S(t)] = S₀e^{μt}', color: c.c2, dash: [6, 4] }]);
        out.innerHTML = 'μ = ' + fmt(mu, 3) + ', σ = ' + fmt(sig, 3) + ', S₀ = ' + (o.s0 || 100) + ', траекторий: ' + npaths;
      } else {
        P.legend([{ label: 'траектории W(t)', color: c.c1 }]);
        out.innerHTML = 'броуновское движение: Δw ~ √Δt — именно поэтому у траекторий нет производной';
      }
    }
    button(box, '↻ новые траектории', () => { seed = (seed * 16807 + 13) % 2147483647; render(); });
    return render;
  };

  // Цена колл-опциона Блэка—Шоулза, касательная = дельта
  function normCdf(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989422804014327 * Math.exp(-x * x / 2);
    let p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return x >= 0 ? 1 - p : p;
  }
  function bsCall(S, K, r, sig, T) {
    if (T <= 0) return Math.max(S - K, 0);
    const d1 = (Math.log(S / K) + (r + sig * sig / 2) * T) / (sig * Math.sqrt(T));
    const d2 = d1 - sig * Math.sqrt(T);
    return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
  }
  widgets.payoff = function (el, o) {
    const K = o.K || 100, r = o.r !== undefined ? o.r : 0.03;
    const P = makePlot(el, { x: o.x || [40, 180], y: o.y || [-5, 90], height: o.height || 340 });
    const box = controlsBox(el);
    const out = readoutBox(el);
    let S0 = o.s0 || 105, sig = o.sigma || 0.25, T = o.T || 0.5;
    function render() {
      P.begin(); P.grid();
      const c = P.col;
      P.fn(S => Math.max(S - K, 0), c.muted, { dash: [4, 4], w: 1.6 });
      P.fn(S => bsCall(S, K, r, sig, T), c.c1, { samples: 400 });
      const C0 = bsCall(S0, K, r, sig, T);
      const h = 0.01 * S0;
      const delta = (bsCall(S0 + h, K, r, sig, T) - bsCall(S0 - h, K, r, sig, T)) / (2 * h);
      const gamma = (bsCall(S0 + h, K, r, sig, T) - 2 * C0 + bsCall(S0 - h, K, r, sig, T)) / (h * h);
      P.lineThrough(S0, C0, delta, c.c2);
      P.dot(S0, C0, c.c1);
      P.legend([
        { label: 'C(S) — цена колла', color: c.c1 },
        { label: 'касательная (Δ-хедж)', color: c.c2 },
        { label: 'выплата max(S−K,0)', color: c.muted, dash: [4, 4] },
      ]);
      out.innerHTML = 'S = <b>' + fmt(S0, 1) + '</b> &nbsp;·&nbsp; C = <b>' + fmt(C0, 2) + '</b>' +
        ' &nbsp;·&nbsp; Δ = ∂C/∂S = <b>' + fmt(delta, 4) + '</b> &nbsp;·&nbsp; Γ = ∂²C/∂S² = <b>' + fmt(gamma, 5) + '</b>';
    }
    slider(box, 'цена акции S', P.xmin + 5, P.xmax - 5, 0.5, S0, v => { S0 = v; render(); }, v => fmt(v, 1));
    slider(box, 'волатильность σ', 0.05, 0.8, 0.005, sig, v => { sig = v; render(); }, v => fmt(v, 2));
    slider(box, 'срок T, лет', 0.02, 2, 0.02, T, v => { T = v; render(); }, v => fmt(v, 2));
    return render;
  };

  // ─────────────────────── монтирование ───────────────────────
  function mountOne(el) {
    const type = el.getAttribute('data-viz');
    const w = widgets[type];
    if (!w) { el.textContent = 'неизвестный виджет: ' + type; return; }
    let opts = {};
    try { opts = JSON.parse(el.getAttribute('data-opts') || '{}'); }
    catch (e) { el.textContent = 'ошибка в data-opts: ' + e.message; return; }
    try {
      const render = w(el, opts);
      mounted.push({ el, render });
      render();
      // перерисовка при изменении ширины
      if (window.ResizeObserver) {
        let lastW = el.clientWidth;
        const ro = new ResizeObserver(() => {
          if (Math.abs(el.clientWidth - lastW) > 2) { lastW = el.clientWidth; render(); }
        });
        ro.observe(el);
      }
    } catch (e) {
      el.textContent = 'ошибка виджета: ' + e.message;
    }
  }

  window.VIZ = {
    mountAll(root) {
      mounted.length = 0;
      (root || document).querySelectorAll('[data-viz]').forEach(mountOne);
    },
    rerenderAll() {
      mounted.forEach(m => { try { m.render(); } catch (e) { /* noop */ } });
    },
  };
})();
