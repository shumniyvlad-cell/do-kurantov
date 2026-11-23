(function () {
  const C = window.DK_CONFIG, DK = window.DK;
  const motion = document.documentElement.classList.contains('motion');
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ');
  const clamp = (x) => Math.min(1, Math.max(0, x));

  /* ---------- Конфиг в вёрстку ---------- */
  $$('[data-cfg]').forEach((el) => { if (C[el.dataset.cfg]) el.textContent = C[el.dataset.cfg]; });
  $$('.js-buy').forEach((a) => { if (a.getAttribute('href') === '#') { a.href = C.buyUrl; a.target = '_blank'; a.rel = 'noopener'; } });
  $$('.js-consult').forEach((a) => { a.href = C.consultUrl; a.target = '_blank'; a.rel = 'noopener'; });
  const seats = $('#seats');
  if (seats) {
    seats.innerHTML = Array.from({ length: C.seatsTotal }, (_, i) => `<i class="${i < C.seatsTaken ? 'taken' : ''}"></i>`).join('');
    $('#seatsTxt').textContent = `Свободно ${C.seatsTotal - C.seatsTaken} из ${C.seatsTotal} мест в декабре`;
  }

  /* ---------- Типограф ---------- */
  function typoTree(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentNode && /SCRIPT|STYLE/.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const list = []; while (w.nextNode()) list.push(w.currentNode);
    list.forEach((n) => { const t = DK.typo(DK.typo(n.nodeValue)); if (t !== n.nodeValue) n.nodeValue = t; });
  }
  typoTree(document.body);

  /* ---------- Табло ---------- */
  $('#heroBoard').outerHTML = DK.board('heroBoard');
  $('#finalBoard').innerHTML = DK.board('finalB', true);
  const boards = [$('#heroBoard'), $('#finalB')];
  setInterval(() => boards.forEach((b) => DK.tick(b)), 1000);

  /* ---------- Появление и шапка ---------- */
  if (motion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.rise').forEach((el) => io.observe(el));
  }
  const top = $('#top'), heroCta = $('.hero .btn-main');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => top.classList.toggle('hidden', e.isIntersecting)).observe(heroCta);
    new IntersectionObserver(([e]) => top.classList.toggle('solid', !e.isIntersecting), { rootMargin: '-72px 0px 0px 0px' }).observe($('.hero-grid'));
  }

  /* ---------- База оживает по прокрутке ---------- */
  const scene = $('#scene'), stage = $('#stage'), tally = $('#tally'), phone = $('.phone');
  const rows = $$('.ct', scene);
  const narrow = matchMedia('(max-width: 980px)');
  let lastSum = -1;
  function paint(p) {
    let sum = 0;
    rows.forEach((row, i) => {
      const end = Number(row.dataset.end);
      let s = 0;
      if (p > 0.06 + i * 0.035) s = 1;
      if (p > 0.36 + i * 0.035 && end >= 2) s = 2;
      if (p > 0.58 + i * 0.03 && end >= 3) s = 3;
      if (row.dataset.s !== String(s)) row.dataset.s = s;
      if (s === 3) sum += Number(row.dataset.pay || 0);
    });
    if (sum !== lastSum) { tally.textContent = fmt(sum); lastSum = sum; }
    stage.style.setProperty('--after', clamp((p - 0.84) / 0.1).toFixed(3));
  }
  function sceneFrame() {
    let p;
    if (narrow.matches) {
      scene.classList.add('static');
      const r = phone.getBoundingClientRect();
      p = clamp((innerHeight * 0.8 - r.top) / (r.height * 1.05));
    } else {
      scene.classList.remove('static');
      const r = scene.getBoundingClientRect();
      p = clamp(-r.top / (scene.offsetHeight - innerHeight));
    }
    paint(p);
  }
  if (motion) {
    let ticking = false;
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { sceneFrame(); ticking = false; }); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    sceneFrame();
  } else { scene.classList.add('static'); paint(1); }

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

  /* ---------- Бесплатный расчёт базы ---------- */
  const form = $('#calcForm'), res = $('#calcRes'), err = $('#calcErr');
  const lock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  $$('input', form).forEach((inp) => inp.addEventListener('input', () => {
    const d = inp.value.replace(/[^\d]/g, '').slice(0, 9);
    inp.value = d ? Number(d).toLocaleString('ru-RU') : '';
    inp.removeAttribute('aria-invalid'); err.hidden = true;
  }));
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
    const pays = DK.num(v.check) > 0 ? Math.max(1, Math.ceil(990 / DK.num(v.check))) : 1;
    res.innerHTML = `<span class="mono">В твоей базе до курантов</span>
      <div class="sum">${DK.T(fmt(f.low) + '–' + fmt(f.high) + ' ₽')}</div>
      <p>${DK.T('Примерно ' + buyers + ' ' + DK.plural(buyers, 'покупка', 'покупки', 'покупок') + ' из ' + people + ' ' + DK.plural(people, 'человека', 'человек', 'человек') + ', если написать лично и с поводом. План окупится ' + (pays === 1 ? 'с первой оплаты.' : 'с ' + pays + '-й оплаты.'))}</p>
      <div class="locked">
        <div>${lock}Предложение под декабрь для твоей ниши</div>
        <div>${lock}Тексты для трёх групп базы и ответы на «подумаю»</div>
        <div>${lock}7 дней по датам и счётчик денег до курантов</div>
      </div>
      <a class="btn btn-main" href="${DK.esc(C.buyUrl)}" target="_blank" rel="noopener">Собрать план <span class="price">${DK.esc(C.price)}</span></a>`;
    res.setAttribute('tabindex', '-1'); res.focus({ preventScroll: true });
    res.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'nearest' });
  });
})();
