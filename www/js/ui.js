/* رابط کاربری */
const UI = (() => {
  let view = 'home';
  let zoomLevel = 1;
  let bracketMode = 'tree'; // tree | list
  function toggleBracketMode() {
    bracketMode = bracketMode === 'tree' ? 'list' : 'tree';
    renderBracket();
  }
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const SPORTS = { football: 'فوتبال', futsal: 'فوتسال', volleyball: 'والیبال', basketball: 'بسکتبال', tennis: 'تنیس', wrestling: 'کشتی', custom: 'آزاد' };
  const STATUS = { setup: 'آماده‌سازی', ongoing: 'در حال برگزاری', done: 'به پایان رسید' };

  function avatar(team, size) {
    if (!team) return '<span class="avatar" style="background:#94a3b8">؟</span>';
    if (team.photo) return '<span class="avatar" style="background:#000"><img src="' + team.photo + '" alt=""></span>';
    return '<span class="avatar" style="background:' + team.color + '">' + esc((team.name || '?').trim().charAt(0)) + '</span>';
  }
  function teamById(t, id) { return t.teams.find(x => x.id === id); }

  /* فشرده‌سازی عکس به dataURL */
  function fileToThumb(file, maxSize, cb) {
    const rd = new FileReader();
    rd.onload = e => {
      const img = new Image();
      img.onload = () => {
        const r = Math.min(1, maxSize / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.width * r));
        cv.height = Math.max(1, Math.round(img.height * r));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        cb(cv.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    rd.readAsDataURL(file);
  }
  function onPhotoInput(input, previewId, storeKey) {
    const f = input.files && input.files[0];
    if (!f) return;
    fileToThumb(f, 256, url => {
      UI[storeKey] = url;
      const p = $(previewId);
      if (p) { p.src = url; p.classList.remove('hidden'); }
    });
  }

  /* ---------- نویگیشن شستی ---------- */
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 15); } catch (e) {} }

  const FABS = {
    home: { icon: '＋', fn: () => UI.openTournamentDialog() },
    bracket: { icon: '🎲', fn: () => UI.openDrawDialog() },
    teams: { icon: '＋', fn: () => UI.openTeamDialog() },
    matches: { icon: '🖼️', fn: () => Export.pngMatches() },
    stats: { icon: '🖼️', fn: () => Export.pngStats() },
    settings: null
  };
  function updateFab() {
    const fab = $('fab');
    if (!fab) return;
    const cfg = FABS[view];
    if (!cfg) { fab.classList.add('hidden'); return; }
    fab.classList.remove('hidden');
    if (fab.textContent !== cfg.icon) {
      fab.textContent = cfg.icon;
      fab.classList.remove('pop'); void fab.offsetWidth; fab.classList.add('pop');
    }
    fab.onclick = () => { buzz(15); cfg.fn(); };
  }
  function moveTabInd() {
    const bar = $('tabbar'), ind = $('tabInd');
    if (!bar || !ind) return;
    const btn = bar.querySelector('button.active');
    if (!btn) return;
    const br = bar.getBoundingClientRect(), r = btn.getBoundingClientRect();
    ind.style.width = Math.max(0, r.width - 8) + 'px';
    ind.style.right = (br.right - r.right + 4) + 'px';
  }

  function switchView(v) {
    view = v;
    document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    document.querySelectorAll('.view').forEach(s => s.classList.add('hidden'));
    $('view-' + v).classList.remove('hidden');
    render();
    updateFab();
    requestAnimationFrame(moveTabInd);
  }

  function render() {
    renderHeader(); renderDrawer();
    if (view === 'home') renderHome();
    else if (view === 'bracket') renderBracket();
    else if (view === 'teams') renderTeams();
    else if (view === 'matches') renderMatches();
    else if (view === 'stats') renderStats();
    else if (view === 'settings') renderSettings();
  }

  function renderHeader() {
    const t = Store.active();
    applyBrand(t);
    if (!t) { $('tournamentName').textContent = 'جدول تک حذفی'; $('tournamentMeta').textContent = 'تورنمنتی انتخاب نشده'; return; }
    $('tournamentName').textContent = t.name;
    const played = Engine.allMatches(t).filter(x => x.m.status === 'done').length;
    const total = Engine.allMatches(t).length;
    $('tournamentMeta').textContent = (SPORTS[t.sport] || '') + ' • ' + t.teams.length + ' تیم • ' +
      (STATUS[t.status] || '') + (total ? ' • ' + played + ' از ' + total + ' بازی' : '');
  }

  /* رنگ برند تورنمنت فعال روی کل اپ */
  function applyBrand(t) {
    try {
      const b = brandColorOf(t || null);
      const root = document.documentElement.style;
      root.setProperty('--brand', b);
      root.setProperty('--brand-d', shade(b, .28));
      root.setProperty('--brand-soft', hexA(b, .14));
    } catch (e) {}
  }

  function renderDrawer() {
    const box = $('tournamentList');
    const all = Store.db.tournaments;
    box.innerHTML = all.length ? all.map(t =>
      '<div class="t-item' + (t.id === Store.db.activeId ? ' active' : '') + '" onclick="UI.selectTournament(\'' + t.id + '\')">' +
      '<div class="n">' + esc(t.name) + '</div><div class="m">' + t.teams.length + ' تیم • ' + (STATUS[t.status] || '') + '</div></div>'
    ).join('') : '<p style="color:var(--muted)">تورنمنتی نیست.</p>';
  }
  function selectTournament(id) { Store.setActive(id); closeDrawer(); render(); }
  function openDrawer() { $('drawer').classList.add('open'); $('drawerOverlay').classList.remove('hidden'); }
  function closeDrawer() { $('drawer').classList.remove('open'); $('drawerOverlay').classList.add('hidden'); }

  /* ---------- خانه ---------- */
  function renderHome() {
    const t = Store.active();
    $('homeEmpty').classList.toggle('hidden', !!t);
    $('homeContent').classList.toggle('hidden', !t);
    if (!t) return;
    const all = Engine.allMatches(t);
    const done = all.filter(x => x.m.status === 'done').length;
    const pct = all.length ? Math.round(done / all.length * 100) : 0;
    $('homeStats').innerHTML =
      statCard(t.teams.length, 'تیم', t.teams.length) + statCard(all.length, 'بازی', all.length) +
      statCard(done, 'انجام‌شده', done) + statCard(pct + '٪', 'پیشرفت', null);
    countUp();
    // ویجت داشبورد: حلقه پیشرفت + بازی بعدی
    const next = all.find(x => x.m.status !== 'done' && x.m.a && x.m.b && x.m.a !== 'BYE' && x.m.b !== 'BYE');
    const R = 30, C = 2 * Math.PI * R;
    const dash = document.createElement('div');
    dash.className = 'dash';
    dash.innerHTML =
      '<div class="dash-card"><svg class="ring" viewBox="0 0 74 74"><circle cx="37" cy="37" r="' + R + '" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="8"/>' +
      '<circle cx="37" cy="37" r="' + R + '" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + (C * pct / 100) + ' ' + C + '" transform="rotate(-90 37 37)"/>' +
      '<text x="37" y="43" text-anchor="middle" class="pct">' + pct + '٪</text></svg><div class="sub">پیشرفت تورنمنت</div></div>' +
      '<div class="dash-card gold"><div class="sub">' + (next ? esc(next.roundTitle) + ' • بازی ' + Engine.faNum(Engine.matchNumber(t, next.m.id)) : 'بازی بعدی') + '</div>' +
      '<div class="big">' + (next ? esc(Engine.teamName(t, next.m.a)) + ' ⚔️ ' + esc(Engine.teamName(t, next.m.b)) : '—') + '</div>' +
      '<div class="sub">' + (next ? countdownText(next.m) : 'همه بازی‌ها تمام شده 🎉') + '</div>' +
      (next ? '<div class="sub">' + esc([next.m.place, next.m.ref ? 'داور: ' + next.m.ref : ''].filter(Boolean).join(' • ') || 'مکان و داور ثبت نشده') + '</div>' +
      '<button class="btn small" style="margin-top:8px" onclick="UI.openMatchDialog(\'' + next.m.id + '\')">✍️ ثبت نتیجه</button>' : '') + '</div></div>';
    const hc = $('homeContent');
    const old = hc.querySelector('.dash');
    if (old) old.remove();
    hc.insertBefore(dash, hc.firstChild);
    const sched = all.filter(x => x.m.status !== 'done' && x.m.a && x.m.b && x.m.a !== 'BYE' && x.m.b !== 'BYE').slice(0, 5);
    $('homeUpcoming').innerHTML = sched.length ? sched.map(x => matchRow(t, x.m, x.roundTitle)).join('') : '<p style="color:var(--muted)">بازی بعدی که ثبت شود، اینجا می‌بینی 📌</p>';
    const today = Engine.todayISO();
    const todays = all.filter(x => x.m.date === today);
    $('homeToday').innerHTML = todays.length ? todays.map(x => matchRow(t, x.m, x.roundTitle)).join('') : '<p style="color:var(--muted)">امروز بازی نداری؛ استراحت کن 😌</p>';
    const recent = all.filter(x => x.m.status === 'done' && x.m.result && x.m.result.type !== 'bye').slice(-5).reverse();
    $('homeRecent').innerHTML = recent.length ? recent.map(x => matchRow(t, x.m, x.roundTitle)).join('') : '<p style="color:var(--muted)">هنوز نتیجه‌ای ثبت نشده؛ اولین برد را بزن! ⚽</p>';
  }
  const statCard = (v, l, n) => '<div class="stat-card"><div class="v"' + (n !== null && n !== undefined ? ' data-n="' + n + '"' : '') + '>' + v + '</div><div class="l">' + l + '</div></div>';

  /* شمارش معکوس انسانی تا شروع بازی */
  function countdownText(m) {
    if (!m.date) return 'هنوز زمانش مشخص نیست 📅';
    const now = new Date();
    const dt = new Date(m.date + 'T' + (m.time || '00:00') + ':00');
    if (isNaN(dt.getTime())) return Engine.faDate(m.date);
    const diff = dt - now;
    if (m.date === Engine.todayISO()) {
      if (!m.time) return 'امروز برگزار می‌شود ☀️';
      if (diff <= 0) return 'نزدیک شروع! 🔥';
      const h = Math.floor(diff / 3600000), min = Math.max(1, Math.round((diff % 3600000) / 60000));
      return h > 0 ? 'امروز، ' + Engine.faNum(h) + ' ساعت و ' + Engine.faNum(min) + ' دقیقه دیگر ⏳'
        : Engine.faNum(min) + ' دقیقه دیگر ⏳';
    }
    if (diff < 0) return Engine.faDate(m.date);
    const d = Math.floor(diff / 86400000);
    if (d <= 0) return 'به‌زودی 🔜';
    if (d === 1) return 'فردا' + (m.time ? ' ساعت ' + m.time : ' 📌');
    try {
      const wd = dt.toLocaleDateString('fa-IR', { weekday: 'long' });
      if (d < 7) return Engine.faNum(d) + ' روز دیگر (' + wd + ')';
    } catch (e) {}
    return Engine.faDate(m.date);
  }

  /* شمارش صعودی اعداد */
  function countUp() {
    document.querySelectorAll('#homeStats .v[data-n]').forEach(el => {
      const target = parseInt(el.dataset.n, 10) || 0;
      const t0 = performance.now(), dur = 700;
      const step = now => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString('fa-IR');
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* بارش confetti قهرمانی */
  function celebrate() {
    const cv = document.createElement('canvas');
    cv.id = 'confettiCv';
    cv.width = innerWidth; cv.height = innerHeight;
    document.body.appendChild(cv);
    const c = cv.getContext('2d');
    const colors = ['#16a34a', '#eab308', '#2563eb', '#dc2626', '#fff'];
    const ps = [];
    for (let i = 0; i < 140; i++) ps.push({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height / 2, s: 4 + Math.random() * 6, v: 2 + Math.random() * 3, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .2, col: colors[i % colors.length] });
    const t0 = performance.now();
    const frame = now => {
      c.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(p => {
        p.y += p.v; p.r += p.vr;
        c.save(); c.translate(p.x, p.y); c.rotate(p.r);
        c.fillStyle = p.col; c.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6);
        c.restore();
      });
      if (now - t0 < 2600) requestAnimationFrame(frame);
      else cv.remove();
    };
    requestAnimationFrame(frame);
  }

  /* کامپوننت واحد کارت بازی (scorecell): همه لیست‌ها */
  function teamDot(t, id) {
    const tm = id && id !== 'BYE' ? teamById(t, id) : null;
    return '<i class="tdot" style="background:' + ((tm && tm.color) || '#94a3b8') + '"></i>';
  }
  function statusPill(t, m) {
    if (m.status === 'done') return '<span class="pill done"><i></i>تمام‌شده</span>';
    if (m.date === todayISO()) return '<span class="pill today"><i></i>امروز</span>';
    return '<span class="pill soon"><i></i>زمان‌بندی‌شده</span>';
  }
  function todayISO() { return Engine.todayISO(); }
  function scorersLine(t, m) {
    if (!Array.isArray(m.scorers) || !m.scorers.length) return '';
    const top = [...m.scorers].sort((a, b) => (b.goals || 0) - (a.goals || 0)).slice(0, 3);
    return '<div class="scorers">⚽ ' + top.map(s => esc(s.name) + (s.goals > 1 ? ' ' + Engine.faNum(s.goals) : '')).join('، ') + '</div>';
  }
  function matchRow(t, m, rt) {
    const a = Engine.teamName(t, m.a), b = Engine.teamName(t, m.b);
    const w = m.status === 'done' && m.result ? m.result.winner : null;
    const num = Engine.matchNumber(t, m.id);
    return '<div class="match-row' + (m.status === 'done' ? ' done' : '') + '" onclick="UI.openMatchDialog(\'' + m.id + '\')">' +
      '<div class="sc-top">' + statusPill(t, m) +
      '<span class="sc-num">' + (num ? 'بازی ' + Engine.faNum(num) + ' • ' : '') + esc(rt || '') + '</span></div>' +
      '<div class="teams"><span class="tname' + (w === m.a ? ' winner' : '') + '">' + teamDot(t, m.a) + esc(a) + '</span>' +
      '<span class="score">' + scoreShort(t, m) + '</span>' +
      '<span class="tname' + (w === m.b ? ' winner' : '') + '">' + esc(b) + teamDot(t, m.b) + '</span></div>' +
      scorersLine(t, m) +
      '<div class="meta"><span>' + esc(metaLine(t, m)) + '</span></div></div>';
  }
  function scoreShort(t, m) {
    if (m.status !== 'done' || !m.result) return '–';
    if (m.result.type === 'bye') return '✓';
    if (m.result.type !== 'score') return m.result.type === 'walkover' ? 'انصراف' : 'حذف';
    const d = Engine.displayScore(m);
    let s = Engine.faNum(d.a) + ' - ' + Engine.faNum(d.b);
    if (m.penA !== null && m.penA !== undefined) s += ' (پنالتی)';
    else if (m.etA !== null && m.etA !== undefined) s += ' (و.ا)';
    return s;
  }
  function metaLine(t, m) {
    const parts = [];
    if (m.date) parts.push(Engine.faDate(m.date));
    if (m.time) parts.push(m.time);
    if (m.place) parts.push(m.place);
    if (m.status === 'done' && m.result && m.result.type === 'score') {
    const c = m.cards || {};
      const tot = (c.ya || 0) + (c.yb || 0) + (c.ra || 0) + (c.rb || 0);
      if (tot) parts.push('🟨' + Engine.faNum((c.ya || 0) + (c.yb || 0)) + ' 🟥' + Engine.faNum((c.ra || 0) + (c.rb || 0)));
      const mn = Engine.mvpName(m);
      if (mn) parts.push('⭐ ' + mn);
    }
    if (m.photo) parts.push('📎');
    return parts.join(' • ');
  }

  /* ---------- جدول ---------- */
  function zoom(d) { zoomLevel = Math.min(1.8, Math.max(0.5, Math.round((zoomLevel + d) * 10) / 10)); applyZoom(); }
  function zoomReset() { zoomLevel = 1; applyZoom(); }
  function applyZoom() { $('bracket').style.transform = 'scale(' + zoomLevel + ')'; }

  function renderBracket() {
    const t = Store.active();
    const has = t && t.rounds.length;
    $('bracketEmpty').classList.toggle('hidden', !!has);
    $('bracketToolbar').classList.toggle('hidden', !has);
    if (!has) {
      $('bracketScroll').classList.add('hidden'); $('bracketList').classList.add('hidden');
      if (t && !t.teams.length) $('bracketEmpty').querySelector('p').textContent = 'اول تیم‌ها را ثبت کن، بعد قرعه‌کشی کن.';
      return;
    }
    if (bracketMode === 'list') {
      $('bracketScroll').classList.add('hidden');
      const box = $('bracketList');
      box.classList.remove('hidden');
      let lastRt = '';
      box.innerHTML = Engine.allMatches(t).map(x => {
        const h = x.roundTitle !== lastRt ? '<h3>' + esc(x.roundTitle) + '</h3>' : '';
        lastRt = x.roundTitle;
        return h + matchRow(t, x.m, x.roundTitle);
      }).join('');
      const tp = t.thirdPlace;
      const tb = $('thirdPlaceBox');
      tb.classList.add('hidden');
      return;
    }
    $('bracketList').classList.add('hidden');
    $('bracketScroll').classList.remove('hidden');
    zoomReset();
    $('bracket').innerHTML = t.rounds.map((rd, r) =>
      '<div class="round"><div class="round-title">' + esc(rd.title) + '</div><div class="round-matches">' +
      rd.matches.map(m => bmatch(t, m)).join('') + '</div></div>'
    ).join('');
    const tp = t.thirdPlace;
    const box = $('thirdPlaceBox');
    if (tp) {
      box.classList.remove('hidden');
      box.innerHTML = '<h3>بازی رده‌بندی</h3>' + matchRow(t, tp, 'سوم / چهارم');
    } else box.classList.add('hidden');
  }

  function bmatch(t, m) {
    const w = m.status === 'done' && m.result ? m.result.winner : null;
    const ds = Engine.displayScore(m);
    const side = (id, key) => {
      const tm = id && id !== 'BYE' ? teamById(t, id) : null;
      const nm = !id ? '...' : id === 'BYE' ? 'استراحت' : (tm ? tm.name : 'حذف‌شده');
      return '<div class="bm-team' + (w === id && id && id !== 'BYE' ? ' w' : (m.status === 'done' && id && id !== 'BYE' ? ' l' : '')) + '">' +
        (tm ? avatar(tm) : '<span class="avatar" style="background:#94a3b8">؟</span>') +
        '<span class="nm">' + esc(nm) + '</span>' +
        '<span class="sc">' + (key === null || key === undefined || key === '' ? '' : esc(String(key))) + '</span></div>';
    };
    let mid;
    if (m.status !== 'done') mid = '<div class="bm-vs">در انتظار</div>';
    else if (!m.result || m.result.type === 'bye') mid = '<div class="bm-vs">✓ صعود با استراحت</div>';
    else if (m.result.type !== 'score') mid = '<div class="bm-vs">' + (m.result.type === 'walkover' ? 'انصراف حریف' : 'حذف انضباطی') + '</div>';
    else mid = '<div class="bm-vs">' + Export.scoreText(t, m) + '</div>';
    return '<div class="bmatch' + (m.status === 'done' ? ' done' : '') + '" onclick="UI.openMatchDialog(\'' + m.id + '\')">' +
      side(m.a, ds.a) + mid + side(m.b, ds.b) +
      '<div class="bm-info">بازی ' + Engine.faNum(Engine.matchNumber(t, m.id)) + ' • ' + esc(metaLine(t, m)) + (m.locked ? ' 🔒' : '') + '</div></div>';
  }

  /* empty state احساسی با اکشن مستقیم */
  function emptyState(icon, title, sub, btn, act) {
    return '<div class="empty"><div class="empty-icon">' + icon + '</div>' +
      '<div class="empty-title">' + title + '</div>' +
      (sub ? '<p>' + sub + '</p>' : '') +
      (btn ? '<button class="btn primary" onclick="' + act + '">' + btn + '</button>' : '') + '</div>';
  }

  /* ---------- تیم‌ها ---------- */
  function renderTeams() {
    const t = Store.active();
    if (!t) { $('teamsList').innerHTML = '<p>تورنمنتی انتخاب نشده.</p>'; return; }
    $('teamsCount').textContent = 'تیم‌ها (' + Engine.faNum(t.teams.length) + ')';
    const q = (($('teamSearch') && $('teamSearch').value) || '').trim();
    const list = t.teams.filter(tm => !q || tm.name.includes(q) || (tm.coach || '').includes(q));
    $('teamsList').innerHTML = list.length ? list.map(tm => {
      const r = t.rounds.length ? Engine.record(t, tm.id) : null;
      return '<div class="team-row" data-tm="' + tm.id + '" style="--tc:' + (tm.color || '#94a3b8') + '">' + avatar(tm) +
        '<div class="info"><div class="n">' + esc(tm.name) + '</div><div class="m">' +
        (tm.coach ? 'مربی: ' + esc(tm.coach) + ' • ' : '') + (tm.rank ? 'سید ' + Engine.faNum(tm.rank) + ' • ' : '') +
        (r ? r.won + ' برد - ' + r.lost + ' باخت' : 'بدون بازی') + '</div></div>' +
        '<div class="acts"><button class="mini" onclick="UI.openTeamDialog(\'' + tm.id + '\')">✏️</button>' +
        '<button class="mini" onclick="UI.removeTeam(\'' + tm.id + '\')">🗑️</button></div></div>';
    }).join('') : (q ? '<div class="empty"><div class="empty-icon">🔍</div><div class="empty-title">چیزی پیدا نشد</div><p>اسم دیگری را امتحان کن</p></div>'
      : emptyState('👥', 'هنوز تیمی ثبت نشده', 'اسامی تیم‌ها را اضافه کن تا بریم سر قرعه‌کشی 🎲', '＋ افزودن تیم', 'UI.openTeamDialog()'));
  }
  function removeTeam(id) {
    const t = Store.active(); if (!t) return;
    if (!confirm('تیم حذف شود؟')) return;
    closeModal();
    Store.removeTeam(t.id, id); render();
  }
  /* منوی سریع لانگ‌پرس روی تیم */
  function openQuickMenu(teamId) {
    const t = Store.active(); if (!t) return;
    const tm = teamById(t, teamId); if (!tm) return;
    openModal('<div class="quick-menu"><div class="q-name">' + esc(tm.name) + '</div>' +
      '<div class="q-sub">' + esc((tm.coach ? 'مربی: ' + tm.coach + ' • ' : '') + (tm.rank ? 'سید ' + Engine.faNum(tm.rank) : 'بدون سید')) + '</div>' +
      '<div class="modal-btns"><button class="btn primary" onclick="UI.closeModal();UI.openTeamDialog(\'' + tm.id + '\')">✏️ ویرایش</button>' +
      '<button class="btn danger" onclick="UI.removeTeam(\'' + tm.id + '\')">🗑️ حذف</button></div>' +
      '<div class="modal-btns"><button class="btn" onclick="UI.closeModal()">بستن</button></div></div>');
  }

  /* ---------- مسابقات ---------- */
  function renderMatches() {
    const t = Store.active();
    if (!t || !t.rounds.length) { $('matchesList').innerHTML = emptyState('📋', 'بازی‌ای اینجا نیست', 'اول قرعه‌کشی کن تا بازی‌ها ساخته شوند ✨', '🎲 قرعه‌کشی', 'UI.openDrawDialog()'); return; }
    const f = $('matchFilter').value;
    const q2 = (($('matchSearch') && $('matchSearch').value) || '').trim();
    let lastRt = '';
    $('matchesList').innerHTML = Engine.allMatches(t)
      .filter(x => (f === 'all' || x.m.status === f) &&
        (!q2 || Engine.teamName(t, x.m.a).includes(q2) || Engine.teamName(t, x.m.b).includes(q2)))
      .map(x => {
        const h = x.roundTitle !== lastRt ? '<h3>' + esc(x.roundTitle) + '</h3>' : '';
        lastRt = x.roundTitle;
        return h + matchRow(t, x.m, x.roundTitle);
      }).join('') || '<p style="color:var(--muted)">بازی‌ای با این فیلتر نیست 🔍</p>';
  }

  /* ---------- آمار ---------- */
  function renderStats() {
    const t = Store.active();
    const box = $('statsContent');
    if (!t || !t.rounds.length) { box.innerHTML = emptyState('📊', 'هنوز آماری نیست', 'بعد از قرعه‌کشی، قهرمان و گلزنان را اینجا می‌بینی 👀', '🎲 قرعه‌کشی', 'UI.openDrawDialog()'); return; }
    const champ = t.champion ? teamById(t, t.champion) : null;
    if (champ && !t.celebrated) {
      t.celebrated = true;
      Store.save();
      setTimeout(celebrate, 350);
    }
    const rows = t.teams.map(tm => Object.assign({ tm }, Engine.record(t, tm.id)))
      .sort((a, b) => b.won - a.won || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
    const rank = Engine.finalRank(t);
    const fair = [...rows].sort((a, b) => a.fair - b.fair || a.y - b.y);
    const mvpBoard = Engine.tournamentMvp(t);
    const mvpMeta = (typeof SPORTS_META !== 'undefined' && (SPORTS_META[t.sport] || SPORTS_META.custom));
    const primaryLbl = ((mvpMeta.mvpStats.find(s => s.key === mvpMeta.primary)) || {}).label || '';
    const mvpHtml = mvpBoard.length ? '<h3>ستارگان میدان ⭐</h3>' +
      (mvpBoard[0].awards ? '<div class="champ"><div class="t">⭐ بهترین بازیکن تورنمنت</div><div class="n">' + esc(mvpBoard[0].name) + '</div><div class="t">' + Engine.faNum(mvpBoard[0].awards) + ' بار بهترین بازیکن' + (primaryLbl ? ' • ' + Engine.faNum(mvpBoard[0].main) + ' ' + primaryLbl : '') + '</div></div>' : '') +
      '<table class="stats"><tr><th>بازیکن</th><th>تیم</th><th>بهترین بازیکن</th>' + (primaryLbl ? '<th>' + primaryLbl + '</th>' : '') + '</tr>' +
      mvpBoard.map(p => '<tr><td>⭐ ' + esc(p.name) + '</td><td>' + esc(Engine.teamName(t, p.team)) + '</td><td>' + Engine.faNum(p.awards) + '</td>' + (primaryLbl ? '<td>' + Engine.faNum(p.main) + '</td>' : '') + '</tr>').join('') + '</table>' : '';
    box.innerHTML =
      '<div class="view-head"><h3>آمار تورنمنت</h3><div><button class="btn small" onclick="Export.pngStats()">🖼️ عکس آمار</button></div></div>' +
      (champ ? '<div class="champ"><div class="t">🏆 قهرمان تورنمنت</div><div class="n">' + esc(champ.name) + '</div></div>' + champPathHtml(t) : '') +
      '<h3>رده‌بندی نهایی</h3>' + rank.map((r, i) => {
        const rtm = teamById(t, r.id);
        return '<div class="rank-row" style="--tc:' + ((rtm && rtm.color) || '#94a3b8') + '"><span class="pos">' + Engine.faNum(i + 1) + '</span>' +
        avatar(rtm) +
        '<span class="nm">' + esc(Engine.teamName(t, r.id)) + '</span><span class="ti">' + esc(r.title) + '</span></div>'; }).join('') +
      '<h3>جدول عملکرد تیم‌ها</h3><table class="stats"><tr><th>تیم</th><th>بازی</th><th>برد</th><th>باخت</th><th>زده</th><th>خورده</th><th>تفاضل</th></tr>' +
      rows.map(r => '<tr><td>' + esc(r.tm.name) + '</td><td>' + Engine.faNum(r.played) + '</td><td>' + Engine.faNum(r.won) +
        '</td><td>' + Engine.faNum(r.lost) + '</td><td>' + Engine.faNum(r.gf) + '</td><td>' + Engine.faNum(r.ga) +
        '</td><td>' + Engine.faNum(r.gf - r.ga) + '</td></tr>').join('') + '</table>' +
      '<h3>بازی جوانمردانه</h3><table class="stats"><tr><th>تیم</th><th>🟨</th><th>🟥</th><th>امتیاز منفی</th></tr>' +
      fair.map(r => '<tr><td>' + esc(r.tm.name) + '</td><td>' + Engine.faNum(r.y) + '</td><td>' + Engine.faNum(r.r) +
        '</td><td>' + Engine.faNum(r.fair) + '</td></tr>').join('') + '</table>' + mvpHtml + scorersHtml(t);
  }

  /* تایم‌لاین مسیر قهرمان تا جام */
  function champPathHtml(t) {
    const path = Engine.championPath(t);
    if (!path.length) return '';
    return '<div class="timeline">' +
      path.map((p, i) =>
        '<div class="tl-row"><span class="tl-dot">' + (i === path.length - 1 ? '🏆' : '✅') + '</span>' +
        '<div class="tl-body"><div class="tl-title">' + esc(p.roundTitle) + '</div>' +
        '<div class="tl-sub">برد ' + Export.scoreText(t, p.m) + ' مقابل ' + esc(Engine.teamName(t, p.opp)) + '</div></div></div>'
      ).join('') + '</div>';
  }

  /* جدول گلزنان و پاسورها (فوتبال/فوتسال) */
  function scorersHtml(t) {
    const tab = Engine.scorersTable(t);
    if (!tab.length) {
      if (t.sport !== 'football' && t.sport !== 'futsal' && t.settings.scoring !== 'goals') return '';
      return '<h3>⚽ گلزنان و پاسورها</h3><p style="color:var(--muted)">هنوز گلی ثبت نشده. از کارت هر بازی، گلزن‌ها را اضافه کن.</p>';
    }
    const top = tab[0];
    return '<h3>⚽ گلزنان برتر</h3>' +
      '<div class="champ"><div class="t">👟 آقای گل</div><div class="n">' + esc(top.name) + '</div>' +
      '<div class="t">' + esc(Engine.teamName(t, top.team)) + ' • ' + Engine.faNum(top.goals) + ' گل' + (top.assists ? ' • ' + Engine.faNum(top.assists) + ' پاس گل' : '') + '</div></div>' +
      '<table class="stats"><tr><th>#</th><th>بازیکن</th><th>تیم</th><th>⚽ گل</th><th>🅰️ پاس</th><th>بازی</th></tr>' +
      tab.map((p, i) => '<tr><td>' + Engine.faNum(i + 1) + '</td><td>' + esc(p.name) + '</td><td>' + esc(Engine.teamName(t, p.team)) +
        '</td><td><strong>' + Engine.faNum(p.goals) + '</strong></td><td>' + Engine.faNum(p.assists) + '</td><td>' + Engine.faNum(p.played) + '</td></tr>').join('') + '</table>';
  }

  /* ---------- تنظیمات ---------- */
  function renderSettings() {
    const t = Store.active();
    if (!t) return;
    $('setThird').checked = !!t.settings.thirdPlace;
    $('setScoring').value = t.settings.scoring || 'goals';
    $('setSeries').value = String(t.settings.series || 1);
    $('setBye').value = t.settings.byeTo || 'top';
    $('setTheme').checked = Store.db.theme === 'dark';
  }
  function guardStructural(msg) {
    const t = Store.active();
    if (t && t.rounds.length) { alert(msg || 'برای این تغییر باید جدول را ریست کنی.'); renderSettings(); return true; }
    return false;
  }
  function saveTournamentSettings() {
    const t = Store.active(); if (!t) return;
    const wantThird = $('setThird').checked;
    if (wantThird !== !!t.settings.thirdPlace) {
      if (guardStructural()) return;
      t.settings.thirdPlace = wantThird;
    }
    const series = parseInt($('setSeries').value, 10);
    if (series !== (t.settings.series || 1)) {
      if (guardStructural()) return;
      t.settings.series = series;
    }
    t.settings.scoring = $('setScoring').value;
    t.settings.byeTo = $('setBye').value;
    Store.save(); renderHeader();
  }
  function saveAppSettings() {
    Store.db.theme = $('setTheme').checked ? 'dark' : 'light';
    Store.save(); applyTheme();
  }
  function applyTheme() { document.documentElement.dataset.theme = Store.db.theme || 'light'; }
  function resetBracket() {
    const t = Store.active(); if (!t || !t.rounds.length) return;
    if (!confirm('کل جدول و نتایج پاک شود؟')) return;
    Engine.resetBracket(t); render();
  }
  function deleteTournament() {
    const t = Store.active(); if (!t) return;
    if (!confirm('«' + t.name + '» برای همیشه حذف شود؟')) return;
    Store.deleteTournament(t.id); render();
  }
  function duplicateTournament() {
    const t = Store.active(); if (!t) return;
    Store.duplicateTournament(t.id); render();
  }

  /* ---------- مودال ---------- */
  function openModal(html) { $('modal').innerHTML = html; $('modalOverlay').classList.remove('hidden'); }
  function closeModal() {
    $('modalOverlay').classList.add('hidden');
    const m = $('modal');
    if (m) m.style.transform = '';
  }

  /* ---------- موتور ژست‌ها (بدون کتابخانه) ---------- */
  function initGestures() {
    const modal = $('modal'), views = $('views'), ptr = $('ptr');

    /* ۱. درگ شیت به پایین برای بستن */
    let sy = 0, dy = 0, dragging = false;
    modal.addEventListener('touchstart', e => {
      if (modal.scrollTop <= 0) { sy = e.touches[0].clientY; dragging = true; dy = 0; }
    }, { passive: true });
    modal.addEventListener('touchmove', e => {
      if (!dragging) return;
      dy = e.touches[0].clientY - sy;
      if (dy > 0) { modal.style.transform = 'translateY(' + Math.min(dy, 220) + 'px)'; modal.classList.add('dragging'); }
    }, { passive: true });
    const endSheet = () => {
      if (!dragging) return;
      dragging = false;
      modal.classList.remove('dragging');
      modal.style.transform = '';
      if (dy > 120) closeModal();
      dy = 0;
    };
    modal.addEventListener('touchend', endSheet);
    modal.addEventListener('touchcancel', endSheet);

    /* ۲. سوایپ روی کارت بازی + ۳. لانگ‌پرس روی تیم */
    let tx = 0, ty = 0, tEl = null, lpTimer = null, lpFired = false;
    document.addEventListener('touchstart', e => {
      tEl = e.target.closest('.match-row') || null;
      lpFired = false;
      if (tEl) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }
      const tm = e.target.closest('.team-row');
      if (tm && tm.dataset.tm && !e.target.closest('button')) {
        const id = tm.dataset.tm;
        lpTimer = setTimeout(() => { lpFired = true; buzz(30); openQuickMenu(id); }, 550);
      }
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (tEl) {
        const dx = e.touches[0].clientX - tx, dyy = e.touches[0].clientY - ty;
        if (Math.abs(dx) > 12 || Math.abs(dyy) > 12) clearTimeout(lpTimer);
      } else clearTimeout(lpTimer);
    }, { passive: true });
    document.addEventListener('touchend', e => {
      clearTimeout(lpTimer);
      if (tEl && !lpFired && e.changedTouches.length) {
        const dx = e.changedTouches[0].clientX - tx, dyy = e.changedTouches[0].clientY - ty;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dyy) * 1.4) tEl.click();
      }
      tEl = null;
    }, { passive: true });

    /* ۴. پول‌تو‌ریفش */
    let py = 0, pulling = false;
    views.addEventListener('touchstart', e => {
      if (views.scrollTop <= 0) { py = e.touches[0].clientY; pulling = true; }
    }, { passive: true });
    views.addEventListener('touchmove', e => {
      if (!pulling || !ptr) return;
      if (e.touches[0].clientY - py > 70) ptr.classList.remove('hidden');
    }, { passive: true });
    views.addEventListener('touchend', e => {
      if (!pulling) return;
      pulling = false;
      if (ptr && !ptr.classList.contains('hidden')) {
        ptr.classList.add('hidden');
        const d = e.changedTouches.length ? e.changedTouches[0].clientY - py : 0;
        if (d > 70) { buzz(20); render(); }
      }
    });
    views.addEventListener('touchcancel', () => { pulling = false; if (ptr) ptr.classList.add('hidden'); });

    window.addEventListener('resize', () => moveTabInd());
  }

  function openTournamentDialog(edit) {
    const t = edit ? Store.active() : null;
    UI._tColor = t ? (t.color || '') : '';
    const swHtml = '<button type="button" class="sw auto' + (!UI._tColor ? ' sel' : '') + '" title="خودکار" onclick="UI.pickColor(this,\'\')"></button>' +
      SPORT_PALETTE.map(c => '<button type="button" class="sw' + (UI._tColor === c ? ' sel' : '') + '" style="background:' + c + '" onclick="UI.pickColor(this,\'' + c + '\')"></button>').join('');
    openModal('<h2>' + (t ? 'ویرایش تورنمنت' : 'تورنمنت جدید') + '</h2>' +
      '<div class="field"><label>نام تورنمنت</label><input id="f_name" value="' + esc(t ? t.name : '') + '" placeholder="مثال: جام رمضان"></div>' +
      '<div class="field"><label>رشته ورزشی</label><select id="f_sport">' +
      Object.keys(SPORTS).map(k => '<option value="' + k + '"' + (t && t.sport === k ? ' selected' : '') + '>' + SPORTS[k] + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>ظرفیت جدول</label><select id="f_size">' +
      [4, 8, 16, 32, 64].map(n => '<option value="' + n + '"' + (t && t.targetSize === n ? ' selected' : '') + '>' + n + ' تیم</option>').join('') + '</select></div>' +
      '<div class="field"><label>تاریخ شروع</label><input type="date" id="f_start" value="' + (t ? t.startDate : '') + '"></div>' +
      '<div class="field"><label>محل برگزاری</label><input id="f_place" value="' + esc(t ? t.place : '') + '"></div>' +
      '<div class="field"><label>نوع امتیاز</label><select id="f_scoring">' +
      [['goals', 'گل'], ['points', 'امتیاز'], ['sets', 'ست']].map(o => '<option value="' + o[0] + '"' + (t && t.settings.scoring === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>فرمت هر تقابل</label><select id="f_series">' +
      [[1, 'تک‌بازی'], [3, 'بهترین از ۳'], [5, 'بهترین از ۵'], [7, 'بهترین از ۷']].map(o => '<option value="' + o[0] + '"' + (t && t.settings.series === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>قرعه استراحت</label><select id="f_bye">' +
      '<option value="top"' + (t && t.settings.byeTo === 'top' ? ' selected' : '') + '>به سیدهای بالا</option>' +
      '<option value="random"' + (t && t.settings.byeTo === 'random' ? ' selected' : '') + '>تصادفی</option></select></div>' +
      '<div class="field"><label>رنگ تورنمنت (خودکار = رنگ رشته)</label><div class="swatches" id="t_sw">' + swHtml + '</div></div>' +
      '<div class="modal-btns"><button class="btn primary" onclick="UI.saveTournament(' + (t ? '\'' + t.id + '\'' : 'null') + ')">ذخیره</button>' +
      '<button class="btn" onclick="UI.closeModal()">انصراف</button></div>');
  }
  function pickColor(el, c) {
    UI._tColor = c || '';
    const box = $('t_sw');
    if (box) box.querySelectorAll('.sw').forEach(b => b.classList.remove('sel'));
    if (el) el.classList.add('sel');
  }
  function saveTournament(id) {
    const data = { name: $('f_name').value, sport: $('f_sport').value, targetSize: $('f_size').value, startDate: $('f_start').value, place: $('f_place').value, color: UI._tColor || null };
    if (!data.name.trim()) { alert('نام تورنمنت الزامی است.'); return; }
    if (id) {
      const t = Store.active();
      const patch = Object.assign({}, data);
      if (t && !t.rounds.length) {
        patch.settings = Object.assign({}, t.settings, { scoring: $('f_scoring').value, series: parseInt($('f_series').value, 10), byeTo: $('f_bye').value });
      }
      Store.updateTournament(id, patch);
    } else {
      data.scoring = $('f_scoring').value; data.series = $('f_series').value; data.byeTo = $('f_bye').value;
      Store.createTournament(data);
    }
    closeModal(); switchView('teams');
  }

  function openTeamDialog(teamId) {
    const t = Store.active(); if (!t) { alert('اول تورنمنت بساز.'); return; }
    const tm = teamId ? teamById(t, teamId) : null;
    UI._teamPhoto = tm ? tm.photo : null;
    openModal('<h2>' + (tm ? 'ویرایش تیم' : 'تیم جدید') + '</h2>' +
      '<div class="field"><label>نام تیم / بازیکن</label><input id="tm_name" value="' + esc(tm ? tm.name : '') + '"></div>' +
      '<div class="field"><label>مربی / سرپرست</label><input id="tm_coach" value="' + esc(tm ? tm.coach : '') + '"></div>' +
      '<div class="field"><label>تلفن</label><input id="tm_phone" inputmode="tel" value="' + esc(tm ? tm.phone : '') + '"></div>' +
      '<div class="field"><label>سید / رنکینگ (۱ = قوی‌ترین؛ عدد بزرگ‌تر = ضعیف‌تر)</label><input id="tm_rank" type="number" min="1" value="' + (tm ? tm.rank : '') + '" placeholder="مثلاً ۱"></div>' +
      '<div class="field"><label>لوگو / عکس تیم</label><input type="file" id="tm_photo" accept="image/*" onchange="UI.onPhotoInput(this,\'tm_prev\',\'_teamPhoto\')">' +
      '<img id="tm_prev" class="photo-prev' + (UI._teamPhoto ? '' : ' hidden') + '" src="' + (UI._teamPhoto || '') + '"></div>' +
      '<div class="modal-btns"><button class="btn primary" onclick="UI.saveTeam(\'' + t.id + '\',' + (tm ? '\'' + tm.id + '\'' : 'null') + ')">ذخیره</button>' +
      '<button class="btn" onclick="UI.closeModal()">انصراف</button></div>');
  }
  function saveTeam(tid, teamId) {
    const d = { name: $('tm_name').value, coach: $('tm_coach').value, phone: $('tm_phone').value, rank: $('tm_rank').value, photo: UI._teamPhoto || null };
    if (teamId) Store.updateTeam(tid, teamId, d); else Store.addTeam(tid, d);
    UI._teamPhoto = null;
    closeModal(); render();
  }

  function openBulkDialog() {
    const t = Store.active(); if (!t) return;
    openModal('<h2>افزودن گروهی</h2><div class="field"><label>هر خط یک تیم (یا فایل CSV با ستون نام)</label><textarea id="bulk" rows="8" placeholder="استقلال\nپرسپولیس\nسپاهان"></textarea></div>' +
      '<div class="field"><input type="file" id="bulkFile" accept=".csv,.txt" onchange="UI.bulkFile(this)"></div>' +
      '<div class="modal-btns"><button class="btn primary" onclick="UI.saveBulk(\'' + t.id + '\')">افزودن</button>' +
      '<button class="btn" onclick="UI.closeModal()">انصراف</button></div>');
  }
  function bulkFile(input) {
    const f = input.files && input.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const text = String(rd.result).replace(/^\ufeff/, '');
      const names = text.split('\n').map(l => l.split(',')[0].trim().replace(/^"|"$/g, '')).filter(Boolean);
      $('bulk').value = names.join('\n');
    };
    rd.readAsText(f, 'utf-8');
  }
  function saveBulk(tid) {
    const lines = $('bulk').value.split('\n').map(s => s.trim()).filter(Boolean);
    let ok = 0;
    for (const name of lines) { if (Store.addTeam(tid, { name })) ok++; }
    alert(ok + ' تیم اضافه شد.');
    closeModal(); render();
  }

  let drawMethod = 'random', manualOrder = [];
  function openDrawDialog() {
    const t = Store.active(); if (!t) return;
    if (t.teams.length < 2) { alert('حداقل ۲ تیم ثبت کن.'); switchView('teams'); return; }
    drawMethod = 'random'; manualOrder = t.teams.map(x => x.id);
    const slots = Engine.nextPow2(t.teams.length);
    openModal('<h2>قرعه‌کشی (' + Engine.faNum(t.teams.length) + ' تیم → جدول ' + Engine.faNum(slots) + ')' + (slots !== t.teams.length ? '<br><small style="color:var(--muted)">' + Engine.faNum(slots - t.teams.length) + ' قرعه استراحت (BYE)</small>' : '') + '</h2>' +
      '<div class="field"><label>روش قرعه‌کشی</label><select id="draw_method" onchange="UI.drawPreview()">' +
      '<option value="random">تصادفی استاندارد (۱ با آخر، ۲ با یکی‌مانده به آخر...)</option>' +
      '<option value="ranked">سیدی (۱ قوی‌ترین)</option>' +
      '<option value="pro">حرفه‌ای تنیسی (۱ و ۲ جدا، بقیه تصادفی)</option>' +
      '<option value="sequential">ترتیبی (۱ با ۲، ۳ با ۴...)</option>' +
      '<option value="manual">دستی (ترتیب دلخواه با ▲▼)</option></select></div>' +
      '<div class="field"><label>قرعه استراحت</label><select id="draw_bye">' +
      '<option value="top"' + ((t.settings.byeTo || 'top') === 'top' ? ' selected' : '') + '>به سیدهای بالا</option>' +
      '<option value="random"' + (t.settings.byeTo === 'random' ? ' selected' : '') + '>تصادفی</option></select></div>' +
      '<div id="drawPreview" class="seed-list"></div>' +
      '<div class="modal-btns"><button class="btn primary" onclick="UI.doDraw()">تأیید و ساخت جدول</button>' +
      '<button class="btn" onclick="UI.closeModal()">انصراف</button></div>' +
      (t.rounds.length ? '<button class="btn small" style="margin-top:8px" onclick="UI.openSwapDialog()">🔀 جابجایی دستی دو تیم (بدون قرعه مجدد)</button>' : ''));
    drawPreview();
  }
  function drawPreview() {
    const t = Store.active();
    drawMethod = $('draw_method').value;
    let arr;
    if (drawMethod === 'ranked' || drawMethod === 'pro') arr = [...t.teams].sort((a, b) => rankVal(a.rank) - rankVal(b.rank));
    else if (drawMethod === 'manual' || drawMethod === 'sequential') arr = manualOrder.map(id => teamById(t, id)).filter(Boolean);
    else arr = [...t.teams];
    $('drawPreview').innerHTML = '<p style="font-size:12px;color:var(--muted)">' +
      (drawMethod === 'pro' ? 'سید ۱ و ۲ در دو نیمه جدا ثابت می‌مانند.' : drawMethod === 'sequential' ? 'تیم‌ها پشت سر هم جفت می‌شوند.' : 'پیش‌نمایش ترتیب سیدها:') + '</p>' +
      arr.map((tm, i) =>
      '<div class="seed-item"><span class="pos">' + Engine.faNum(i + 1) + '</span><span class="nm">' + esc(tm.name) + '</span>' +
      (drawMethod === 'manual' ? '<button class="mini" onclick="UI.manualMove(' + i + ',-1)">▲</button><button class="mini" onclick="UI.manualMove(' + i + ',1)">▼</button>' : '') +
      '</div>').join('');
  }
  function manualMove(i, d) {
    const t = Store.active();
    const j = i + d;
    if (j < 0 || j >= manualOrder.length) return;
    [manualOrder[i], manualOrder[j]] = [manualOrder[j], manualOrder[i]];
    // بازسازی ترتیب نمایشی بر اساس manualOrder
    const arr = manualOrder.map(id => teamById(t, id)).filter(Boolean);
    $('drawPreview').innerHTML = arr.map((tm, k) =>
      '<div class="seed-item"><span class="pos">' + Engine.faNum(k + 1) + '</span><span class="nm">' + esc(tm.name) + '</span>' +
      '<button class="mini" onclick="UI.manualMove(' + k + ',-1)">▲</button><button class="mini" onclick="UI.manualMove(' + k + ',1)">▼</button></div>').join('');
  }
  function doDraw() {
    const t = Store.active();
    if (t.rounds.length && !confirm('جدول فعلی و نتایج پاک و دوباره قرعه‌کشی شود؟')) return;
    if (drawMethod === 'manual' || drawMethod === 'sequential') {
      t.teams.sort((a, b) => manualOrder.indexOf(a.id) - manualOrder.indexOf(b.id));
    }
    t.settings.byeTo = $('draw_bye').value;
    if (Engine.generateBracket(t, drawMethod)) { buzz(25); closeModal(); switchView('bracket'); }
  }

  function openSwapDialog() {
    const t = Store.active(); if (!t || !t.rounds.length) return;
    const opts = t.teams.map(tm => '<option value="' + tm.id + '">' + esc(tm.name) + '</option>').join('');
    openModal('<h2>جابجایی دو تیم</h2><p style="font-size:13px;color:var(--muted)">نتایج ثبت‌شده پاک می‌شود.</p>' +
      '<div class="field"><label>تیم اول</label><select id="sw_a">' + opts + '</select></div>' +
      '<div class="field"><label>تیم دوم</label><select id="sw_b">' + opts + '</select></div>' +
      '<div class="modal-btns"><button class="btn primary" onclick="UI.doSwap()">جابجا کن</button>' +
      '<button class="btn" onclick="UI.closeModal()">انصراف</button></div>');
  }
  function doSwap() {
    const t = Store.active();
    if ($('sw_a').value === $('sw_b').value) { alert('دو تیم متفاوت انتخاب کن.'); return; }
    if (!confirm('نتایج پاک می‌شود. ادامه؟')) return;
    Engine.swapTeams(t, $('sw_a').value, $('sw_b').value);
    closeModal(); render();
  }

  /* ---------- دیالوگ بازی فوق‌حرفه‌ای ---------- */
  function gameUnitLabel(t) {
    return t.settings.scoring === 'sets' ? 'ست' : t.settings.scoring === 'points' ? 'دست' : 'بازی';
  }
  function openMatchDialog(matchId) {
    const t = Store.active();
    const m = Engine.findMatch(t, matchId);
    if (!m) return;
    UI._matchPhoto = m.photo || null;
    const aN = Engine.teamName(t, m.a), bN = Engine.teamName(t, m.b);
    const canPlay = m.a && m.b && m.a !== 'BYE' && m.b !== 'BYE';
    const series = t.settings.series || 1;
    const sc = t.settings.scoring === 'goals' ? 'گل' : t.settings.scoring === 'sets' ? 'ست' : 'امتیاز';
    const num = Engine.matchNumber(t, m.id);

    let scoreHtml = '';
    if (series > 1) {
      const unit = gameUnitLabel(t);
      scoreHtml = '<div id="scoreBox"><p style="font-size:12px;color:var(--muted)">نتیجه هر ' + unit + ' (برد ' + Engine.faNum(Math.ceil(series / 2)) + ' از ' + Engine.faNum(series) + '):</p>';
      for (let i = 0; i < series; i++) {
        const g = (m.games && m.games[i]) || {};
        scoreHtml += '<div class="game-row"><span class="gl">' + unit + ' ' + Engine.faNum(i + 1) + '</span>' +
          '<input id="gm_a_' + i + '" type="number" min="0" placeholder="' + esc(aN) + '" value="' + (g.a === null || g.a === undefined ? '' : g.a) + '">' +
          '<span>-</span>' +
          '<input id="gm_b_' + i + '" type="number" min="0" placeholder="' + esc(bN) + '" value="' + (g.b === null || g.b === undefined ? '' : g.b) + '"></div>';
      }
      scoreHtml += '</div>';
    } else if (t.settings.scoring === 'goals') {
      scoreHtml = '<div id="scoreBox">' +
        '<div class="field"><label>' + sc + ' ۹۰ دقیقه ' + esc(aN) + '</label><input id="mt_a" type="number" min="0" value="' + (m.scoreA === null ? '' : m.scoreA) + '"></div>' +
        '<div class="field"><label>' + sc + ' ۹۰ دقیقه ' + esc(bN) + '</label><input id="mt_b" type="number" min="0" value="' + (m.scoreB === null ? '' : m.scoreB) + '"></div>' +
        '<div class="field"><label>' + sc + ' وقت اضافه (اختیاری، فقط هنگام تساوی)</label><div style="display:flex;gap:6px">' +
        '<input id="mt_ea" type="number" min="0" placeholder="' + esc(aN) + '" value="' + (m.etA === null || m.etA === undefined ? '' : m.etA) + '">' +
        '<input id="mt_eb" type="number" min="0" placeholder="' + esc(bN) + '" value="' + (m.etB === null || m.etB === undefined ? '' : m.etB) + '"></div></div>' +
        '<div class="field"><label>پنالتی (فقط در صورت تساوی نهایی)</label><div style="display:flex;gap:6px">' +
        '<input id="mt_pa" type="number" min="0" placeholder="' + esc(aN) + '" value="' + (m.penA === null || m.penA === undefined ? '' : m.penA) + '">' +
        '<input id="mt_pb" type="number" min="0" placeholder="' + esc(bN) + '" value="' + (m.penB === null || m.penB === undefined ? '' : m.penB) + '"></div></div></div>';
    } else {
      scoreHtml = '<div id="scoreBox"><div class="field"><label>' + sc + ' ' + esc(aN) + '</label><input id="mt_a" type="number" min="0" value="' + (m.scoreA === null ? '' : m.scoreA) + '"></div>' +
        '<div class="field"><label>' + sc + ' ' + esc(bN) + '</label><input id="mt_b" type="number" min="0" value="' + (m.scoreB === null ? '' : m.scoreB) + '"></div>' +
        '<div class="field"><label>پنالتی (فقط در صورت تساوی)</label><div style="display:flex;gap:6px">' +
        '<input id="mt_pa" type="number" min="0" placeholder="' + esc(aN) + '" value="' + (m.penA === null || m.penA === undefined ? '' : m.penA) + '">' +
        '<input id="mt_pb" type="number" min="0" placeholder="' + esc(bN) + '" value="' + (m.penB === null || m.penB === undefined ? '' : m.penB) + '"></div></div></div>';
    }

    const c = m.cards || {};
    const meta = (typeof SPORTS_META !== 'undefined' && (SPORTS_META[t.sport] || SPORTS_META.custom));
    const mv = (m.mvp && typeof m.mvp === 'object') ? m.mvp : { name: Engine.mvpName(m), team: '', stats: {} };
    const mvpStatHtml = meta.mvpStats.map(s => {
      const v = (mv.stats && mv.stats[s.key]) || 0;
      const input = s.type === 'check'
        ? '<select id="ms_' + s.key + '"><option value="0"' + (!v ? ' selected' : '') + '>ندارد</option><option value="1"' + (v ? ' selected' : '') + '>دارد</option></select>'
        : '<input id="ms_' + s.key + '" type="number" min="0" value="' + v + '">';
      return '<label style="flex:1;min-width:70px;font-size:11px">' + s.label + input + '</label>';
    }).join('');
    openModal('<h2>' + esc(aN) + ' — ' + esc(bN) + '</h2>' +
      '<p style="font-size:12px;color:var(--muted)">' + (num ? 'بازی ' + Engine.faNum(num) + ' • ' : '') + esc((m.title || '') + ' • وضعیت: ' + (m.status === 'done' ? 'تمام‌شده' : 'زمان‌بندی‌شده')) + '</p>' +
      (m.result && m.result.type === 'bye' ? '<p>این بازی با قرعه استراحت تعیین شد.</p>' :
      '<div class="field"><label>نوع نتیجه</label><select id="mt_type" onchange="UI.matchTypeToggle()">' +
        '<option value="score">نتیجه عادی</option>' +
        '<option value="walkover">انصراف یک تیم</option>' +
        '<option value="dq">حذف انضباطی</option></select></div>' + scoreHtml +
      '<div id="winnerBox" class="field hidden"><label>تیم صعودکننده</label><select id="mt_w">' +
        (canPlay ? '<option value="' + m.a + '">' + esc(aN) + '</option><option value="' + m.b + '">' + esc(bN) + '</option>' : '') + '</select></div>' +
      '<div class="field"><label>کارت‌ها (زرد / قرمز هر تیم)</label><div class="cards4">' +
        '<label>🟨 ' + esc(aN.slice(0, 8)) + '<input id="mt_ya" type="number" min="0" value="' + (c.ya || 0) + '"></label>' +
        '<label>🟨 ' + esc(bN.slice(0, 8)) + '<input id="mt_yb" type="number" min="0" value="' + (c.yb || 0) + '"></label>' +
        '<label>🟥 ' + esc(aN.slice(0, 8)) + '<input id="mt_ra" type="number" min="0" value="' + (c.ra || 0) + '"></label>' +
        '<label>🟥 ' + esc(bN.slice(0, 8)) + '<input id="mt_rb" type="number" min="0" value="' + (c.rb || 0) + '"></label></div></div>' +
      '<div class="field"><label>⭐ بهترین بازیکن میدان (' + meta.name + ')</label><input id="mt_mvp" value="' + esc(mv.name || '') + '" placeholder="نام بازیکن">' +
      '<div style="display:flex;gap:6px;margin-top:6px"><select id="mt_mvp_team" style="flex:1">' +
      '<option value="">تیم: نامشخص</option>' +
      (canPlay ? '<option value="' + m.a + '"' + (mv.team === m.a ? ' selected' : '') + '>' + esc(aN) + '</option><option value="' + m.b + '"' + (mv.team === m.b ? ' selected' : '') + '>' + esc(bN) + '</option>' : '') +
      '</select></div>' +
      '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">' + mvpStatHtml + '</div></div>') +
      (showScorers ? '<div class="field"><label>⚽ گلزن‌ها و پاسورها</label><div id="scorerList"></div>' +
      '<button class="btn small" type="button" onclick="UI.addScorerRow()">＋ افزودن بازیکن</button>' +
      '<div id="scorerWarn" style="font-size:12px;color:var(--muted);margin-top:4px"></div></div>' : '') +
      '<div class="field"><label>توضیحات</label><input id="mt_note" value="' + esc(m.result ? m.result.note || '' : '') + '"></div>' +
      '<div class="field"><label>📎 ضمیمه (عکس سند نتیجه)</label><input type="file" id="mt_photo" accept="image/*" onchange="UI.onPhotoInput(this,\'mt_prev\',\'_matchPhoto\')">' +
      '<img id="mt_prev" class="photo-prev' + (UI._matchPhoto ? '' : ' hidden') + '" src="' + (UI._matchPhoto || '') + '">' +
      (UI._matchPhoto ? '<button class="btn small" onclick="UI.clearMatchPhoto()">حذف ضمیمه</button>' : '') + '</div>' +
      '<h2 style="margin-top:10px">زمان‌بندی</h2>' +
      '<div class="field"><label>تاریخ</label><input type="date" id="mt_date" value="' + (m.date || '') + '"></div>' +
      '<div class="field"><label>ساعت</label><input type="time" id="mt_time" value="' + (m.time || '') + '"></div>' +
      '<div class="field"><label>محل</label><input id="mt_place" value="' + esc(m.place || '') + '"></div>' +
      '<div class="field"><label>داور</label><input id="mt_ref" value="' + esc(m.ref || '') + '"></div>' +
      '<div class="modal-btns">' +
      (canPlay && !(m.result && m.result.type === 'bye') ? '<button class="btn primary" onclick="UI.saveMatchResult(\'' + m.id + '\')">ثبت نتیجه</button>' : '') +
      '<button class="btn" onclick="UI.saveMatchSchedule(\'' + m.id + '\')">ذخیره زمان‌بندی</button></div>' +
      '<div class="modal-btns">' +
      (m.status === 'done' && !(m.result && m.result.type === 'bye') ? '<button class="btn small danger" onclick="UI.clearMatch(\'' + m.id + '\')">↩ پاک کردن نتیجه</button>' : '') +
      '<button class="btn small" onclick="Export.pngMatch(\'' + m.id + '\')">🖼️</button>' +
      '<button class="btn small" onclick="UI.toggleLock(\'' + m.id + '\')">' + (m.locked ? '🔓 باز کردن' : '🔒 قفل') + '</button>' +
      '<button class="btn small" onclick="UI.closeModal()">بستن</button></div>');
    if (showScorers) renderScorerRows();
  }
  function clearMatchPhoto() {
    UI._matchPhoto = '';
    const p = $('mt_prev');
    if (p) { p.src = ''; p.classList.add('hidden'); }
  }
  /* ---------- گلزن‌ها و پاسورها ---------- */
  function scorerTeamOptions(sel) {
    const ctx = UI._scCtx || {};
    const opt = (id, nm) => '<option value="' + id + '"' + (sel === id ? ' selected' : '') + '>' + esc(nm || '') + '</option>';
    return opt(ctx.a, ctx.aN) + opt(ctx.b, ctx.bN);
  }
  function renderScorerRows() {
    const box = $('scorerList');
    if (!box) return;
    const ctx = UI._scCtx || {};
    box.innerHTML = (UI._scorers || []).map((s, i) =>
      '<div class="game-row"><input value="' + esc(s.name || '') + '" placeholder="نام بازیکن" style="flex:2" oninput="UI.syncScorer(' + i + ',\'name\',this)">' +
      '<select style="flex:1.4" onchange="UI.syncScorer(' + i + ',\'team\',this)">' + scorerTeamOptions(s.team) + '</select>' +
      '<input type="number" min="0" style="width:52px" title="گل" placeholder="⚽" value="' + (s.goals || 0) + '" oninput="UI.syncScorer(' + i + ',\'goals\',this)">' +
      '<input type="number" min="0" style="width:52px" title="پاس گل" placeholder="🅰️" value="' + (s.assists || 0) + '" oninput="UI.syncScorer(' + i + ',\'assists\',this)">' +
      '<button class="mini" type="button" onclick="UI.delScorerRow(' + i + ')">🗑️</button></div>'
    ).join('') || '<p style="font-size:12px;color:var(--muted)">هنوز ثبت نشده.</p>';
    updateScorerWarn();
  }
  function updateScorerWarn() {
    const w = $('scorerWarn');
    if (!w) return;
    const ctx = UI._scCtx || {};
    // جمع گل‌های ثبت‌شده هر تیم در برابر نتیجه بازی
    const m = { a: 0, b: 0 };
    (UI._scorers || []).forEach(s => {
      const g = parseInt(s.goals, 10) || 0;
      if (s.team === ctx.a) m.a += g; else if (s.team === ctx.b) m.b += g;
    });
    const ta = ($('mt_a') && $('mt_a').value !== '' ? parseInt($('mt_a').value, 10) : null);
    const tb = ($('mt_b') && $('mt_b').value !== '' ? parseInt($('mt_b').value, 10) : null);
    const ea = ($('mt_ea') && $('mt_ea').value !== '' ? parseInt($('mt_ea').value, 10) : 0) || 0;
    const eb = ($('mt_eb') && $('mt_eb').value !== '' ? parseInt($('mt_eb').value, 10) : 0) || 0;
    const notes = [];
    if (ta !== null && m.a > ta + ea) notes.push('گل‌های ' + (ctx.aN || '') + ' (' + Engine.faNum(m.a) + ') بیشتر از نتیجه (' + Engine.faNum(ta + ea) + ') است');
    if (tb !== null && m.b > tb + eb) notes.push('گل‌های ' + (ctx.bN || '') + ' (' + Engine.faNum(m.b) + ') بیشتر از نتیجه (' + Engine.faNum(tb + eb) + ') است');
    w.textContent = notes.join(' • ');
    w.style.color = notes.length ? '#dc2626' : 'var(--muted)';
  }
  function addScorerRow() {
    UI._scorers = UI._scorers || [];
    const ctx = UI._scCtx || {};
    UI._scorers.push({ name: '', team: ctx.a || null, goals: 1, assists: 0 });
    renderScorerRows();
  }
  function delScorerRow(i) {
    UI._scorers.splice(i, 1);
    renderScorerRows();
  }
  function syncScorer(i, field, el) {
    if (!UI._scorers || !UI._scorers[i]) return;
    UI._scorers[i][field] = field === 'name' || field === 'team' ? el.value : (parseInt(el.value, 10) || 0);
    if (field === 'goals') updateScorerWarn();
  }
  function matchTypeToggle() {
    const v = $('mt_type').value;
    $('scoreBox').classList.toggle('hidden', v !== 'score');
    $('winnerBox').classList.toggle('hidden', v === 'score');
  }
  function collectSchedule() {
    return { date: $('mt_date').value, time: $('mt_time').value, place: $('mt_place').value, ref: $('mt_ref').value };
  }
  function saveMatchSchedule(id) {
    const t = Store.active();
    Engine.setSchedule(t, id, collectSchedule());
    closeModal(); render();
  }
  function saveMatchResult(id) {
    const t = Store.active();
    const m = Engine.findMatch(t, id);
    const type = $('mt_type') ? $('mt_type').value : 'score';
    const d = Object.assign({ type }, collectSchedule());
    if (type === 'score') {
      const series = t.settings.series || 1;
      if (series > 1) {
        d.games = [];
        for (let i = 0; i < series; i++) {
          const a = $('gm_a_' + i), b = $('gm_b_' + i);
          if (a && b && (a.value !== '' || b.value !== '')) d.games.push({ a: a.value, b: b.value });
        }
      } else {
        d.scoreA = $('mt_a').value; d.scoreB = $('mt_b').value;
        if ($('mt_ea')) { d.etA = $('mt_ea').value; d.etB = $('mt_eb').value; }
        if ($('mt_pa')) { d.penA = $('mt_pa').value; d.penB = $('mt_pb').value; }
      }
      d.ya = $('mt_ya').value; d.yb = $('mt_yb').value;
      d.ra = $('mt_ra').value; d.rb = $('mt_rb').value;
      const mvStats = {};
      const meta2 = (typeof SPORTS_META !== 'undefined' && (SPORTS_META[t.sport] || SPORTS_META.custom));
      meta2.mvpStats.forEach(s => {
        const el = $('ms_' + s.key);
        if (el) mvStats[s.key] = el.value;
      });
      d.mvp = { name: $('mt_mvp').value, team: $('mt_mvp_team').value, stats: mvStats };
      d.scorers = (UI._scorers || []).filter(s => String(s.name || '').trim()).map(s => ({ name: s.name, team: s.team, goals: s.goals, assists: s.assists }));
      if (UI._matchPhoto !== undefined && UI._matchPhoto !== null) d.photo = UI._matchPhoto;
    } else d.winner = $('mt_w').value;
    d.note = $('mt_note').value;
    if (Engine.setResult(t, id, d)) { UI._matchPhoto = null; buzz(25); closeModal(); render(); }
  }
  function clearMatch(id) {
    const t = Store.active();
    if (!confirm('نتیجه این بازی پاک و بازی‌های بعدیِ وابسته ریست شود؟')) return;
    Engine.clearResult(t, id);
    closeModal(); render();
  }
  function toggleLock(id) {
    const t = Store.active();
    const m = Engine.findMatch(t, id);
    m.locked = !m.locked;
    Store.save(); closeModal(); render();
  }

  return {
    switchView, render, renderMatches, toggleBracketMode,
    selectTournament, openDrawer, closeDrawer,
    openTournamentDialog, saveTournament, openTeamDialog, saveTeam, removeTeam,
    openBulkDialog, saveBulk, bulkFile, openDrawDialog, drawPreview, manualMove, doDraw,
    openSwapDialog, doSwap,
    openMatchDialog, matchTypeToggle, saveMatchResult, saveMatchSchedule, clearMatch, toggleLock,
    onPhotoInput, clearMatchPhoto, pickColor, applyBrand,
    buzz, updateFab, moveTabInd, initGestures, openQuickMenu,
    addScorerRow, delScorerRow, syncScorer, renderScorerRows,
    zoom, zoomReset, saveTournamentSettings, saveAppSettings,
    resetBracket, deleteTournament, duplicateTournament,
    closeModal, applyTheme
  };
})();
