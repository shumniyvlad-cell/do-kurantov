(function () {
  const C = window.DK_CONFIG, DK = window.DK;
  const motion = document.documentElement.classList.contains('motion');
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ');
  const clamp = (x, a, b) => Math.min(b == null ? 1 : b, Math.max(a || 0, x));
  const pad = (n) => String(n).padStart(2, '0');

  /* ---------- Конфиг в вёрстку ---------- */
  $$('[data-cfg]').forEach((el) => { if (C[el.dataset.cfg]) el.textContent = C[el.dataset.cfg]; });
  $$('.js-buy').forEach((a) => { if (a.getAttribute('href') === '#') { a.href = C.buyUrl; a.target = '_blank'; a.rel = 'noopener'; } });
  $$('.js-consult').forEach((a) => { a.href = C.consultUrl; a.target = '_blank'; a.rel = 'noopener'; });
  $$('.js-bot').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });
  const seats = $('#seats');
  if (seats) {
    seats.innerHTML = Array.from({ length: C.seatsTotal }, (_, i) => `<i class="${i < C.seatsTaken ? 'taken' : ''}"></i>`).join('');
    $('#seatsTxt').textContent = `Свободно ${C.seatsTotal - C.seatsTaken} из ${C.seatsTotal} мест в декабре`;
  }

  /* ---------- Типограф ---------- */
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentNode && /SCRIPT|STYLE/.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  const texts = []; while (w.nextNode()) texts.push(w.currentNode);
  texts.forEach((n) => { const t = DK.typo(DK.typo(n.nodeValue)); if (t !== n.nodeValue) n.nodeValue = t; });

  /* ---------- Часы ---------- */
  function clock(mark) {
    const ticks = Array.from({ length: 60 }, (_, i) => {
      const big = i % 5 === 0, a = i * 6 * Math.PI / 180, r1 = 188, r2 = big ? (i === 0 ? 150 : 162) : 178;
      const x1 = 200 + r1 * Math.sin(a), y1 = 200 - r1 * Math.cos(a), x2 = 200 + r2 * Math.sin(a), y2 = 200 - r2 * Math.cos(a);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${i === 0 ? '#FF7A1A' : big ? '#F4EEE2' : 'rgba(244,238,226,.35)'}" stroke-width="${i === 0 ? 9 : big ? 5 : 2}" stroke-linecap="round"/>`;
    }).join('');
    return `<svg class="dial" viewBox="0 0 400 400" aria-hidden="true">
      <circle cx="200" cy="200" r="196" fill="none" stroke="rgba(244,238,226,.18)" stroke-width="2"/>
      ${ticks}
      ${mark ? '<text x="200" y="128" text-anchor="middle" font-family="Alumni Sans" font-weight="900" font-size="34" fill="#FF7A1A">XII</text>' : ''}
      <g class="hand h"><rect x="194" y="96" width="12" height="118" rx="6" fill="#F4EEE2"/></g>
      <g class="hand m"><rect x="196.5" y="40" width="7" height="174" rx="3.5" fill="#F4EEE2"/></g>
      <g class="hand s"><rect x="199" y="28" width="2" height="196" fill="#FF7A1A"/><circle cx="200" cy="58" r="7" fill="#FF7A1A"/></g>
      <circle cx="200" cy="200" r="11" fill="#FF7A1A"/><circle cx="200" cy="200" r="4" fill="#0B1A15"/>
    </svg>`;
  }
  function setHands(el, h, m, s) {
    el.querySelector('.h').style.setProperty('--a', ((h % 12) * 30 + m * 0.5) + 'deg');
    el.querySelector('.m').style.setProperty('--a', (m * 6 + s * 0.1) + 'deg');
    el.querySelector('.s').style.setProperty('--a', (s * 6) + 'deg');
  }
  const heroDial = $('#heroDial'), finalDial = $('#finalDial'), storyDial = $('#storyDial');
  heroDial.innerHTML = clock(true); finalDial.innerHTML = clock(true); storyDial.innerHTML = clock(false);
  let lastSec = -1, secTurns = 0;
  function live() {
    const d = new Date(); const s = d.getSeconds();
    // секундная стрелка не прыгает назад на 0
    if (s === 0 && lastSec === 59) secTurns++;
    lastSec = s;
    [heroDial, finalDial].forEach((el) => setHands(el, d.getHours(), d.getMinutes(), s + secTurns * 60));
  }
  live(); setInterval(live, 1000);

  /* ---------- Табло ---------- */
  $('#heroBoard').outerHTML = DK.board('heroBoard');
  $('#finalBoard').innerHTML = DK.board('finalB', true);
  setInterval(() => [$('#heroBoard'), $('#finalB')].forEach((b) => DK.tick(b)), 1000);

  /* ---------- Появление, шапка, прогресс ---------- */
  if (motion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.rise').forEach((el) => io.observe(el));
  }
  const top = $('#top'), progress = $('#progress');
  new IntersectionObserver(([e]) => top.classList.toggle('hidden', e.isIntersecting)).observe($('.hero .btn-main'));
  new IntersectionObserver(([e]) => top.classList.toggle('solid', !e.isIntersecting), { rootMargin: '-72px 0px 0px 0px' }).observe($('.hero-title'));

  /* ---------- Звук курантов: синтез в WebAudio ---------- */
  let ac = null, soundOn = false;
  const soundBtn = $('#sound');
  function bell(t0, f) {
    const out = ac.createGain(); out.gain.value = 0.0001; out.connect(ac.destination);
    out.gain.exponentialRampToValueAtTime(0.22, t0 + 0.01);
    out.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
    [[1, 1], [2.0, 0.55], [2.76, 0.4], [5.4, 0.22], [8.93, 0.12]].forEach(([k, g]) => {
      const o = ac.createOscillator(), gg = ac.createGain();
      o.type = 'sine'; o.frequency.value = f * k; gg.gain.value = g;
      o.connect(gg); gg.connect(out); o.start(t0); o.stop(t0 + 3.3);
    });
  }
  function tick() {
    if (!soundOn) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'square'; o.frequency.value = 1800; g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.06);
  }
  function chimes() { if (!soundOn) return; const t = ac.currentTime + 0.1; for (let i = 0; i < 12; i++) bell(t + i * 1.1, 196); }
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.setAttribute('aria-pressed', soundOn);
    if (soundOn) {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      ac.resume();
      bell(ac.currentTime + 0.02, 196);
    }
  });

  /* ---------- Сюжет: 7 минут до полуночи ---------- */
  const story = $('#story'), stage = $('#stage'), chs = $$('.ch', story), readout = $('#readout'), readoutDay = $('#readoutDay'), tallyEl = $('#tally');
  const TALLY = [0, 0, 0, 30000, 45000, 60000, 75000, 75000];
  let curCh = -1, shown = 0, target = 0, rung = false, raf = 0;
  function countTo(v) {
    target = v; cancelAnimationFrame(raf);
    const from = shown, t0 = performance.now();
    const step = (t) => { const k = clamp((t - t0) / 700); shown = from + (target - from) * (1 - Math.pow(1 - k, 3)); tallyEl.textContent = fmt(shown); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  }
  function setChapter(i) {
    if (i === curCh) return;
    chs.forEach((c, k) => c.classList.toggle('on', k === i));
    if (curCh !== -1) tick();
    curCh = i;
    readoutDay.textContent = i >= 7 ? '1 января' : `день ${i + 1} из 7`;
    if (motion) countTo(TALLY[i]); else tallyEl.textContent = fmt(TALLY[i]);
    story.classList.toggle('midnight', i >= 7);
    if (i >= 7 && !rung) { rung = true; chimes(); }
    if (i < 6) rung = false;
  }
  function storyFrame() {
    const r = story.getBoundingClientRect();
    const p = clamp(-r.top / (story.offsetHeight - innerHeight));
    const M = 53 + clamp(p / 0.92) * 7;            // минута после 23:00
    const mm = Math.min(60, M);
    setHands(storyDial, 23, mm % 60 === 0 && mm === 60 ? 60 : mm, (mm - Math.floor(mm)) * 60);
    readout.textContent = mm >= 60 ? '00:00' : '23:' + pad(Math.floor(mm));
    stage.style.setProperty('--k', clamp(p * 1.1).toFixed(3));
    setChapter(Math.min(7, Math.floor(mm - 53)));
  }
  if (motion) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        storyFrame();
        const doc = document.documentElement;
        progress.style.setProperty('--p', (doc.scrollTop / (doc.scrollHeight - innerHeight)).toFixed(4));
        ticking = false;
      });
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    onScroll();
  } else {
    story.classList.add('static');
    chs.forEach((c) => c.classList.add('on'));
    setHands(storyDial, 0, 0, 0);
    readout.textContent = '00:00'; readoutDay.textContent = '1 января';
    tallyEl.textContent = fmt(75000);
    story.classList.add('midnight');
  }

  /* ---------- Пример плана ---------- */
  const sample = DK.compute({ niche: 'salon', what: 'курс массажа лица, 4 занятия', check: 15000, prepay: 'yes', priceup: 'up', recent: 40, old: 60, leads: 120, where: ['tg', 'ig'], touch: 'never', time: 60, calls: 'some', block: 'shame' });
  $('#sample').innerHTML = DK.sheet(sample, { compact: true, no: 'ДК-01231' });
  const tilt = $('#tilt');
  if (motion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    tilt.addEventListener('pointermove', (e) => {
      const b = tilt.getBoundingClientRect(); const px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
      tilt.style.setProperty('--ry', ((px - 0.5) * 10).toFixed(2) + 'deg');
      tilt.style.setProperty('--rx', ((0.5 - py) * 7).toFixed(2) + 'deg');
      tilt.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
      tilt.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      tilt.style.setProperty('--go', 1);
    });
    tilt.addEventListener('pointerleave', () => { ['--rx', '--ry'].forEach((k) => tilt.style.setProperty(k, '0deg')); tilt.style.setProperty('--go', 0); });
  }

  /* ---------- Бесплатный расчёт: фраза с полями ---------- */
  const form = $('#calcForm'), res = $('#calcRes'), err = $('#calcErr');
  const lock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const fit = (inp) => { inp.style.width = Math.max(2.2, (inp.value || inp.placeholder).length + 0.6) + 'ch'; };
  $$('input', form).forEach((inp) => {
    fit(inp);
    inp.addEventListener('input', () => {
      const d = inp.value.replace(/[^\d]/g, '').slice(0, 9);
      inp.value = d ? Number(d).toLocaleString('ru-RU') : '';
      inp.removeAttribute('aria-invalid'); err.hidden = true; fit(inp);
    });
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    const people = DK.num(v.recent) + DK.num(v.old) + DK.num(v.leads);
    if (!people || !DK.num(v.check)) {
      err.hidden = false;
      const bad = !people ? form.elements.recent : form.elements.check;
      bad.setAttribute('aria-invalid', 'true'); bad.focus();
      return;
    }
    const f = DK.quick(v.recent, v.old, v.leads, v.check);
    const buyers = Math.max(1, Math.round(f.buyers));
    const pays = Math.max(1, Math.ceil(990 / DK.num(v.check)));
    const mln = (n) => (n / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 1 });
    const range = (a, b) => (b >= 1e6 ? `${mln(a)}–\u2060${mln(b)} млн ₽` : `${Math.round(a / 1000)}–${Math.round(b / 1000)} тыс. ₽`);
    res.innerHTML = `<div><span class="mono">До курантов в твоей базе</span>
        <div class="sum">${DK.esc(range(f.low, f.high))}</div>
        <p>${DK.T('Примерно ' + buyers + ' ' + DK.plural(buyers, 'покупка', 'покупки', 'покупок') + ' из ' + people + ' ' + DK.plural(people, 'человека', 'человек', 'человек') + ', если написать лично и с поводом. План окупится ' + (pays === 1 ? 'с первой оплаты.' : 'с ' + pays + '-й оплаты.'))}</p></div>
      <div><div class="locked">
        <div>${lock}Предложение под декабрь для твоей ниши</div>
        <div>${lock}Тексты для трёх групп базы и ответы на «подумаю»</div>
        <div>${lock}7 дней по датам и счётчик денег до курантов</div>
      </div>
      <div class="res-ctas"><a class="btn btn-ink" href="${DK.esc(C.buyUrl)}" target="_blank" rel="noopener">Собрать план <span class="price">${DK.esc(C.price)}</span></a>
      <a class="btn btn-ghost" href="${DK.esc(C.botUrl.replace('start=site', 'start=site_calc'))}" target="_blank" rel="noopener">Чек-лист в Telegram</a></div></div>`;
    res.setAttribute('tabindex', '-1'); res.focus({ preventScroll: true });
    res.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'nearest' });
  });
})();
