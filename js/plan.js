(function () {
  const DK = window.DK, C = window.DK_CONFIG;
  const motion = document.documentElement.classList.contains('motion');
  const app = document.getElementById('app'), prog = document.getElementById('prog');
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const T = DK.T, esc = DK.esc;
  const KEY = 'dk-v1';
  const B = DK.BLOCKS;

  let state = load() || { step: -1, a: {}, track: {} };
  if (!state.track) state.track = {};
  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* приватный режим */ } }

  const warn = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg>';
  const shield = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>';

  function drawProg(i) { prog.innerHTML = B.map((_, k) => `<i class="${k < i ? 'on' : k === i ? 'now' : ''}"></i>`).join(''); }

  // «Назад» телефона ведёт на предыдущий шаг
  function go(step, push) {
    state.step = step; save();
    if (push !== false) history.pushState({ step }, '');
    render(); window.scrollTo(0, 0); app.focus({ preventScroll: true });
  }
  addEventListener('popstate', (e) => { const s = e.state && typeof e.state.step === 'number' ? e.state.step : -1; state.step = s; save(); render(); window.scrollTo(0, 0); });
  history.replaceState({ step: state.step }, '');

  function render() {
    if (state.step === -1) return intro();
    if (state.step >= 0 && state.step < B.length) return block(state.step);
    if (state.step === B.length) return result();
    state.step = -1; intro();
  }

  /* ---------- Вступление ---------- */
  function intro() {
    drawProg(-1);
    const started = Object.keys(state.a).length > 0;
    app.innerHTML = `<section class="intro">
      <div id="introBoard"></div>
      <h1>${T('Собираем твой план до курантов')}</h1>
      <p class="lead">${T('13 вопросов, 10 минут. Цифры по базе можно примерно: важен порядок, а не точность до человека.')}</p>
      <ul>${B.map((b, i) => `<li><span class="n">${i + 1}</span><div><b>${T(b.title)}</b><span>${T(b.lead)}</span></div></li>`).join('')}</ul>
      <div class="row">
        <button class="btn btn-main" type="button" id="start">${started ? 'Продолжить с места остановки' : 'Начать'}</button>
        ${started ? '<button class="btn btn-ghost" type="button" id="reset">Начать заново</button>' : ''}
      </div>
      <p class="privacy">${shield}${T('Ответы и цифры остаются на этом устройстве. Мы их не видим и никуда не отправляем.')}</p>
    </section>`;
    $('#introBoard').outerHTML = DK.board('introBoard', true);
    $('#start').addEventListener('click', () => {
      if (!started) return go(0);
      const firstEmpty = B.findIndex((b) => b.q.some((q) => !filled(q)));
      go(firstEmpty === -1 ? B.length : firstEmpty);
    });
    const r = $('#reset'); if (r) r.addEventListener('click', () => { state = { step: -1, a: {}, track: {} }; save(); go(0); });
  }

  function filled(q) {
    const v = state.a[q.id];
    if (q.kind === 'many') return Array.isArray(v) && v.length > 0;
    if (q.kind === 'money' || q.kind === 'count') return v !== undefined && v !== '' && v !== null;
    if (q.kind === 'text') return typeof v === 'string' && v.trim().length >= 3;
    return v !== undefined && v !== '';
  }

  /* ---------- Блок вопросов ---------- */
  function qHtml(q) {
    const v = state.a[q.id];
    const hint = q.hint ? `<p class="q-hint" id="h-${q.id}">${T(q.hint)}</p>` : '';
    const err = `<p class="err" id="e-${q.id}" hidden>${warn}<span></span></p>`;
    let ctl = '';
    if (q.kind === 'type') {
      ctl = `<div class="types" role="group" aria-labelledby="t-${q.id}">${DK.NICHES.map((t) => `<button type="button" class="opt" data-v="${t.id}" aria-pressed="${v === t.id}"><span>${T(t.label)}</span><small>${T(t.hint)}</small></button>`).join('')}</div>`;
    } else if (q.kind === 'one') {
      ctl = `<div class="opts" role="group" aria-labelledby="t-${q.id}">${q.options.map((o) => `<button type="button" class="opt" data-v="${esc(o.v)}" aria-pressed="${String(v) === String(o.v)}">${T(o.t)}</button>`).join('')}</div>`;
    } else if (q.kind === 'many') {
      const arr = Array.isArray(v) ? v : [];
      ctl = `<div class="opts many" role="group" aria-labelledby="t-${q.id}">${q.options.map((o) => `<button type="button" class="opt" data-v="${esc(o.v)}" aria-pressed="${arr.includes(o.v)}">${T(o.t)}</button>`).join('')}</div>`;
    } else if (q.kind === 'money' || q.kind === 'count') {
      const shown = v === undefined || v === '' ? '' : Number(v).toLocaleString('ru-RU');
      ctl = `<div class="field ${q.kind === 'count' ? 'cnt' : q.kind}"><input id="i-${q.id}" inputmode="numeric" autocomplete="off" enterkeyhint="next" aria-describedby="${q.hint ? 'h-' + q.id + ' ' : ''}e-${q.id}" placeholder="${esc(q.placeholder || '')}" value="${esc(shown)}"></div>`;
    } else if (q.kind === 'text') {
      ctl = `<div class="field"><input id="i-${q.id}" maxlength="${q.max || 80}" autocomplete="off" enterkeyhint="next" aria-describedby="e-${q.id}" placeholder="${esc(q.placeholder || '')}" value="${esc(v || '')}"><span class="count" id="c-${q.id}">${(v || '').length}/${q.max || 80}</span></div>`;
    }
    const isInput = ['money', 'count', 'text'].includes(q.kind);
    const label = isInput ? `<label class="q-text" id="t-${q.id}" for="i-${q.id}">${T(q.text)}</label>` : `<span class="q-text" id="t-${q.id}">${T(q.text)}</span>`;
    return `<div class="q" data-q="${q.id}">${label}${hint}${ctl}${err}</div>`;
  }

  function block(i) {
    drawProg(i);
    const b = B[i];
    app.innerHTML = `<section>
      <div class="block-head"><span class="mono">Блок ${i + 1} из ${B.length}</span><h2>${T(b.title)}</h2><p>${T(b.lead)}</p></div>
      <form id="f" novalidate>${b.q.map(qHtml).join('')}
        <div class="nav">
          <button type="button" class="btn btn-ghost" id="back">Назад</button>
          <button type="submit" class="btn btn-main">${i === B.length - 1 ? 'Собрать план' : 'Дальше'}</button>
        </div>
      </form>
    </section>`;

    b.q.forEach((q) => {
      const box = $(`[data-q="${q.id}"]`);
      if (q.kind === 'type' || q.kind === 'one') {
        $$('.opt', box).forEach((btn) => btn.addEventListener('click', () => {
          const raw = btn.dataset.v; const opt = q.options && q.options.find((o) => String(o.v) === raw);
          state.a[q.id] = opt ? opt.v : raw; save();
          $$('.opt', box).forEach((x) => x.setAttribute('aria-pressed', x === btn));
          clearErr(q.id);
        }));
      } else if (q.kind === 'many') {
        $$('.opt', box).forEach((btn) => btn.addEventListener('click', () => {
          let arr = Array.isArray(state.a[q.id]) ? state.a[q.id].slice() : [];
          const val = btn.dataset.v;
          arr = arr.includes(val) ? arr.filter((x) => x !== val) : arr.concat(val);
          state.a[q.id] = arr; save();
          $$('.opt', box).forEach((x) => x.setAttribute('aria-pressed', arr.includes(x.dataset.v)));
          clearErr(q.id);
        }));
      } else if (q.kind === 'money' || q.kind === 'count') {
        const inp = $('input', box);
        inp.addEventListener('input', () => {
          const digits = inp.value.replace(/[^\d]/g, '').slice(0, q.kind === 'count' ? 6 : 10);
          const caret = inp.value.length - inp.selectionStart;
          inp.value = digits ? Number(digits).toLocaleString('ru-RU') : '';
          const pos = Math.max(0, inp.value.length - caret); inp.setSelectionRange(pos, pos);
          state.a[q.id] = digits === '' ? '' : Number(digits); save(); clearErr(q.id);
        });
      } else if (q.kind === 'text') {
        const inp = $('input', box);
        inp.addEventListener('input', () => { state.a[q.id] = inp.value; save(); $(`#c-${q.id}`).textContent = `${inp.value.length}/${q.max || 80}`; clearErr(q.id); });
      }
    });

    $('#back').addEventListener('click', () => go(i - 1));
    $('#f').addEventListener('submit', (e) => {
      e.preventDefault();
      let first = null;
      b.q.forEach((q) => {
        if (!filled(q)) {
          const msg = q.kind === 'money' ? 'Впиши сумму цифрами' : q.kind === 'count' ? 'Впиши число, можно 0' : q.kind === 'text' ? 'Напиши хотя бы пару слов' : q.kind === 'many' ? 'Отметь хотя бы один вариант' : 'Выбери вариант';
          showErr(q.id, msg); if (!first) first = q;
        }
      });
      if (!first && b.id === 'a' && DK.num(state.a.check) < 1) { showErr('check', 'Чек должен быть больше нуля'); first = b.q.find((q) => q.id === 'check'); }
      if (!first && b.id === 'b' && DK.num(state.a.recent) + DK.num(state.a.old) + DK.num(state.a.leads) === 0) { showErr('recent', 'Нужен хотя бы один человек в базе'); first = b.q.find((q) => q.id === 'recent'); }
      if (first) {
        const box = $(`[data-q="${first.id}"]`);
        box.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'center' });
        const f = $('input, .opt', box); f && f.focus({ preventScroll: true });
        return;
      }
      if (i === B.length - 1) return run();
      go(i + 1);
    });
  }
  function showErr(id, msg) { const box = $(`[data-q="${id}"]`); box.classList.add('has-err'); const e = $(`#e-${id}`); e.hidden = false; $('span', e).textContent = msg; const inp = $('input', box); if (inp) inp.setAttribute('aria-invalid', 'true'); }
  function clearErr(id) { const box = $(`[data-q="${id}"]`); if (!box) return; box.classList.remove('has-err'); const e = $(`#e-${id}`); if (e) e.hidden = true; const inp = $('input', box); if (inp) inp.removeAttribute('aria-invalid'); }

  /* ---------- Собираем ---------- */
  function run() {
    drawProg(B.length);
    history.pushState({ step: B.length }, '');
    state.step = B.length; save();
    app.innerHTML = `<section class="running" role="status"><div><span class="logo-mark big" aria-hidden="true"></span><h2>${T('Собираем план')}</h2><p>${T('Считаем деньги в базе, подбираем предложение и тексты')}</p></div></section>`;
    window.scrollTo(0, 0);
    setTimeout(result, motion ? 1400 : 200);
  }

  /* ---------- Счётчик денег ---------- */
  function trackerHtml(r) {
    const segs = ['a', 'b', 'c'].filter((s) => ({ a: r.recent, b: r.old, c: r.leads }[s] > 0));
    const t = state.track;
    const row = (s) => {
      const v = t[s] || {}; const n = { a: r.recent, b: r.old, c: r.leads }[s];
      const step = (k, lab) => `<div class="stp"><span>${lab}</span><div class="stp-c"><button type="button" class="sb" data-s="${s}" data-k="${k}" data-d="-1" aria-label="${lab}: меньше">−</button><output id="o-${s}-${k}">${v[k] || 0}</output><button type="button" class="sb" data-s="${s}" data-k="${k}" data-d="1" aria-label="${lab}: больше">+</button></div></div>`;
      return `<div class="tr-row"><div class="tr-h"><b>${T(DK.SEGMENTS[s].title)}</b><span>${n} ${DK.plural(n, 'человек', 'человека', 'человек')}</span></div>${step('sent', 'Написал')}${step('rep', 'Ответили')}${step('paid', 'Оплатили')}</div>`;
    };
    return `<section class="tracker no-print" aria-label="Счётчик денег до курантов">
      <div class="tr-top"><div><span class="mono">Собрано до курантов</span><b id="trSum">0 ₽</b><span class="tr-of" id="trOf"></span></div><div id="trBoard"></div></div>
      <div class="tr-bar"><i id="trBar"></i></div>
      ${segs.map(row).join('')}
      <p class="tr-note">${T('Сумма считается как оплаты × чек ' + DK.money(r.check) + '. Всё хранится на этом телефоне.')}</p>
    </section>`;
  }
  function trackerUpdate(r) {
    const t = state.track;
    const paid = ['a', 'b', 'c'].reduce((s, k) => s + ((t[k] && t[k].paid) || 0), 0);
    const sum = paid * r.check;
    $('#trSum').textContent = DK.money(sum);
    $('#trOf').textContent = DK.typo('из прогноза ' + DK.money(r.low).replace(' ₽', '') + '–' + DK.money(r.high));
    $('#trBar').style.transform = `scaleX(${Math.min(1, sum / Math.max(r.mid, 1)).toFixed(3)})`;
  }

  /* ---------- План ---------- */
  function result() {
    drawProg(B.length);
    const missing = B.findIndex((b) => b.q.some((q) => !filled(q)));
    if (missing !== -1) {
      app.innerHTML = `<section class="intro"><h2>${T('Не хватает ответов')}</h2><p class="lead">${T('План собирается из всех трёх блоков. Вернись к блоку ' + (missing + 1) + ' и допиши ответы.')}</p><button class="btn btn-main" type="button" id="fix">Вернуться к блоку ${missing + 1}</button></section>`;
      $('#fix').addEventListener('click', () => go(missing));
      return;
    }
    let r;
    try { r = DK.compute(state.a); } catch (err) {
      app.innerHTML = `<section class="intro"><h2>${T('Что-то сломалось при расчёте')}</h2><p class="lead">${T('Ответы сохранены. Попробуй ещё раз.')}</p><button class="btn btn-main" type="button" id="retry">Повторить</button></section>`;
      $('#retry').addEventListener('click', result); return;
    }
    if (!state.no) { state.no = 'ДК-' + String(Date.now()).slice(-5); save(); }
    if (!state.started) { state.started = Date.now(); save(); }
    r.start = new Date(state.started); r.start.setHours(0, 0, 0, 0);
    r.days.forEach((d, i) => { const dt = new Date(r.start); dt.setDate(dt.getDate() + i); d.date = dt; });

    app.innerHTML = `<div class="res-actions no-print">
        <button class="btn btn-main" type="button" id="pdf">Сохранить PDF</button>
        <button class="btn btn-ghost" type="button" id="edit">Поправить ответы</button>
      </div>
      ${trackerHtml(r)}
      ${DK.sheet(r, { no: state.no })}
      <aside class="upsell night no-print">
        <div><h3>${T('База большая или чек от 50 000 ₽?')}</h3><p>${T('Разбор с Андреем, 60 минут: усиливает предложение и вместе с тобой пишет первые десять сообщений самым важным клиентам.')} <b>15&nbsp;000&nbsp;₽</b></p></div>
        <a class="btn btn-main" href="${esc(C.consultUrl)}" target="_blank" rel="noopener">Записаться</a>
      </aside>
      <p class="restore no-print">${T('План и счётчик сохранены на этом устройстве: вернёшься по той же ссылке, всё будет здесь.')}</p>`;

    $('#trBoard').outerHTML = DK.board('trBoard', true);
    trackerUpdate(r);
    $$('.sb', app).forEach((b) => b.addEventListener('click', () => {
      const s = b.dataset.s, k = b.dataset.k, d = Number(b.dataset.d);
      const n = { a: r.recent, b: r.old, c: r.leads }[s];
      const t = state.track[s] = state.track[s] || { sent: 0, rep: 0, paid: 0 };
      t[k] = Math.max(0, Math.min(n, (t[k] || 0) + d));
      save();
      $(`#o-${s}-${k}`).textContent = t[k];
      trackerUpdate(r);
    }));
    $$('.copy', app).forEach((b) => b.addEventListener('click', async () => {
      const txt = b.dataset.copy;
      try { await navigator.clipboard.writeText(txt); } catch (e) {
        const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      const was = b.textContent; b.textContent = 'Скопировано'; b.classList.add('done');
      setTimeout(() => { b.textContent = was; b.classList.remove('done'); }, 1600);
    }));
    $('#pdf').addEventListener('click', () => window.print());
    $('#edit').addEventListener('click', () => go(0));
  }

  setInterval(() => $$('.board', app).forEach((b) => DK.tick(b)), 1000);
  render();
})();
