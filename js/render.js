/* Отрисовка плана, табло и сообщений. Нужен method.js */
(function (DK) {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = (s) => esc(DK.typo(s));
  const pad = (n) => String(n).padStart(2, '0');

  /* Табло обратного отсчёта до Нового года */
  function board(id, small) {
    const l = DK.left();
    const cell = (v, k, lab) => `<div class="fl-cell"><div class="fl" data-k="${k}">${String(v).split('').map((c) => `<span class="fl-d">${c}</span>`).join('')}</div><span class="fl-l">${lab}</span></div>`;
    return `<div class="board${small ? ' small' : ''}" id="${id || ''}" role="timer" aria-label="До Нового года ${l.d} ${DK.plural(l.d, 'день', 'дня', 'дней')}">
      ${cell(l.d, 'd', DK.plural(l.d, 'день', 'дня', 'дней'))}<i class="fl-sep">:</i>${cell(pad(l.h), 'h', 'часов')}<i class="fl-sep">:</i>${cell(pad(l.m), 'm', 'минут')}<i class="fl-sep">:</i>${cell(pad(l.s), 's', 'секунд')}
    </div>`;
  }
  function tick(el) {
    if (!el) return;
    const l = DK.left();
    const vals = { d: String(l.d), h: pad(l.h), m: pad(l.m), s: pad(l.s) };
    el.querySelectorAll('.fl').forEach((f) => {
      const v = vals[f.dataset.k];
      const ds = f.querySelectorAll('.fl-d');
      if (ds.length !== v.length) { f.innerHTML = v.split('').map((c) => `<span class="fl-d">${c}</span>`).join(''); return; }
      ds.forEach((d, i) => { if (d.textContent !== v[i]) { d.textContent = v[i]; d.classList.remove('flip'); void d.offsetWidth; d.classList.add('flip'); } });
    });
  }

  const nicheLabel = (id) => (DK.NICHES.find((n) => n.id === id) || DK.NICHES[0]).label;

  function messages(r, seg) {
    const offer = DK.OFFERS[r.main];
    const first = DK.OPEN[seg](r) + ' ' + offer.line(r) + ' ' + DK.CTA[seg];
    const second = DK.SECOND(seg, r, offer);
    return { first, second };
  }

  function msgBlock(r, seg, i) {
    const s = DK.SEGMENTS[seg];
    const n = { a: r.recent, b: r.old, c: r.leads }[seg];
    const m = messages(r, seg);
    return `<div class="seg">
      <div class="seg-head"><span class="seg-n">${'АБВ'[i]}</span><div><h4>${T(s.title)}</h4><span>${T(s.note)}, ${n} ${DK.plural(n, 'человек', 'человека', 'человек')}</span></div></div>
      <div class="msg"><span class="msg-k">Первое сообщение, дни 2–3</span><p>${T(m.first)}</p><button type="button" class="copy no-print" data-copy="${esc(m.first)}">Скопировать</button></div>
      <div class="msg two"><span class="msg-k">Второе, через три дня, если промолчал</span><p>${T(m.second)}</p><button type="button" class="copy no-print" data-copy="${esc(m.second)}">Скопировать</button></div>
    </div>`;
  }

  function sheet(r, opt) {
    opt = opt || {};
    const no = opt.no || ('ДК-' + String(Date.now()).slice(-5));
    const main = DK.OFFERS[r.main], spare = DK.OFFERS[r.spare];
    const blockSay = DK.ANDREY[r.answers.block] || DK.ANDREY.words;
    const segs = ['a', 'b', 'c'].filter((s) => ({ a: r.recent, b: r.old, c: r.leads }[s] > 0));
    const prompt = `Помоги написать личное сообщение моему бывшему клиенту. Вот наша прошлая переписка: [вставь кусок переписки]. Моё предложение: ${main.line(r)} Напиши 3–4 предложения, на «ты» или «вы», как в переписке. Упомяни что-то конкретное из прошлого общения. Без восклицательных знаков и без слов «уникальный», «акция», «только сегодня».`;
    const days = r.days.map((d, i) => `<li><div class="day-n"><b>${i + 1}</b><span>${esc(DK.wdRu(d.date))}, ${esc(DK.dayRu(d.date))}</span></div><div><h4>${T(d.t)}</h4><p>${T(d.d(r))}</p></div></li>`).join('');

    return `<article class="plan${opt.compact ? ' compact' : ''}" aria-label="План до курантов">
      <header class="pl-head">
        <div class="pl-brand"><span class="logo-mark" aria-hidden="true"></span><div><b>План до курантов</b><span class="mono">${esc(no)}</span></div></div>
        <div class="pl-obj"><span class="mono">${esc(nicheLabel(r.niche))}</span><b>${T('«' + r.what + '»')}</b><span>${T('чек ' + DK.money(r.check) + ', в базе ' + r.base + ' ' + DK.plural(r.base, 'человек', 'человека', 'человек'))}</span></div>
      </header>

      <section class="pl-money">
        <div class="pl-sum"><span class="mono">Можно собрать до курантов</span><b>${T(DK.money(r.low).replace(' ₽', ''))}–${T(DK.money(r.high))}</b><p>${T('Это ориентир по средним откликам на личные сообщения, а не обещание. Точнее покажет счётчик ниже, когда начнёшь.')}</p></div>
        <div class="pl-cells">
          <div><span class="mono">Покупок</span><b>${Math.max(1, Math.round(r.buyers))}</b><small>${T('из ' + r.base + ' человек в базе')}</small></div>
          <div><span class="mono">Сообщений в день</span><b>${Math.min(r.need, r.perDay)}</b><small>${T(r.fits ? 'в дни первой волны, влезает в твоё время' : 'столько успеешь; начни с самых тёплых')}</small></div>
          <div><span class="mono">Реклама</span><b>0 ₽</b><small>${T('все эти люди уже знают тебя')}</small></div>
        </div>
      </section>

      <section class="pl-block">
        <h3>Предложение</h3>
        <div class="offer"><span class="tag">Главное</span><h4>${T(main.title)}</h4><p>${T(main.why)}</p></div>
        <div class="offer spare"><span class="tag">Запасное</span><h4>${T(spare.title)}</h4><p>${T(spare.why + ' Используй его во втором сообщении, если главное не зашло.')}</p></div>
        <blockquote><span class="mono">Андрей</span>${T(DK.ANDREY.base)}</blockquote>
      </section>

      <section class="pl-block">
        <h3>7 дней по дням</h3>
        <ol class="days">${days}</ol>
        <blockquote><span class="mono">Андрей</span>${T(blockSay)}</blockquote>
      </section>

      <section class="pl-block">
        <h3>Тексты сообщений</h3>
        <p class="pl-lead">${T('Подставь имя и отправляй. Каждому лично, не рассылкой.')}</p>
        <div class="segs">${segs.map((s, i) => msgBlock(r, s, ['a', 'b', 'c'].indexOf(s))).join('')}</div>
      </section>

      <section class="pl-block">
        <h3>Если ответили так</h3>
        <dl class="obj">${DK.OBJECTIONS.map((o) => `<div><dt>«${esc(o[0])}»</dt><dd>${T(o[1])}</dd></div>`).join('')}</dl>
        ${r.answers.calls !== 'no' ? `<blockquote><span class="mono">Андрей</span>${T(DK.ANDREY.calls)}</blockquote>` : ''}
      </section>

      <section class="pl-block">
        <h3>Промпт для нейросети</h3>
        <p class="pl-lead">${T('Для самых важных клиентов: вставь кусок старой переписки, и сообщение станет ещё личнее.')}</p>
        <div class="prompt"><p>${T(prompt)}</p><button type="button" class="copy no-print" data-copy="${esc(prompt)}">Скопировать промпт</button></div>
      </section>

      <section class="pl-block pl-rules">
        <h3>Пять правил без дожима</h3>
        <ol>${DK.RULES.map((x) => `<li>${T(x)}</li>`).join('')}</ol>
        <blockquote><span class="mono">Андрей</span>${T(DK.ANDREY.nopush)}</blockquote>
      </section>

      <footer class="pl-foot"><span>${T('Методика Андрея Харда. Прогноз — ориентир по средним откликам, итог зависит от твоего предложения и базы.')}</span><span class="mono">До курантов</span></footer>
    </article>`;
  }

  DK.board = board;
  DK.tick = tick;
  DK.sheet = sheet;
  DK.messages = messages;
  DK.esc = esc;
  DK.T = T;
})(window.DK);
