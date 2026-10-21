/* رابط کاربری — تم تیره لیمویی (متصل به داده واقعی، آفلاین) */
const UI = (() => {
  let view = 'home';
  let zoomLevel = 1;
  let bracketMode = 'tree'; // tree | list
  let currentRound = 0;
  let overviewOn = false;
  let currentMatchId = null;
  let stageFilter = 'all';
  let teamSort = 'seed';

  function toggleBracketMode() {
    bracketMode = bracketMode === 'tree' ? 'list' : 'tree';
    if (bracketMode === 'list') overviewOn = false;
    renderBracket();
  }
  function showRound(i) {
    currentRound = i;
    overviewOn = false;
    bracketMode = 'tree';
    renderBracket();
  }
  function toggleOverview() {
    overviewOn = !overviewOn;
    if (overviewOn) bracketMode = 'tree';
    renderBracket();
  }
  function openToolsDialog() {
    const t0 = Store.active();
    const dbl = t0 && Engine.isDouble(t0);
    const asn = t0 && Engine.isAsian(t0);
    const rr = t0 && Engine.isRoundRobin(t0);
    openModal('<h2>ابزارهای جدول (فصل دوم، سوم، چهارم و پنجم)</h2>' +
      '<p class="note">نما، چیدمان مجدد، رپشاژ و خروجی‌ها</p>' +
      '<div class="grid2">' +
      '<button class="action" onclick="UI.closeModal();UI.toggleOverview()">◈ نمای کل مسیر</button>' +
      '<button class="action" onclick="UI.closeModal();UI.switchView(\'matches\')">📋 نمای فهرستی</button>' +
      '<button class="action" onclick="UI.closeModal();UI.openDrawDialog()">🎲 چیدمان مجدد (الف/ب/ج)</button>' +
      ((dbl || asn) ? '' : '<button class="action" onclick="UI.closeModal();UI.openSwapDialog()">🔀 جابه‌جایی سید نزدیک</button>') +
      ((dbl || asn || rr) ? '' : '<button class="action" onclick="UI.closeModal();UI.buildRepechage()">🥉 رپشاژ (شانس مجدد)</button>') +
      '<button class="action" onclick="UI.closeModal();UI.switchView(\'learn\')">📖 آموزش فصل دوم تا پنجم</button>' +
      '<button class="action" onclick="UI.closeModal();Export.png()">🖼️ عکس PNG</button>' +
      '<button class="action" onclick="UI.closeModal();Export.print()">🖨️ چاپ / PDF</button></div>' +
      '<div class="modal-btns"><button class="action" onclick="UI.closeModal();Export.csv()">📊 خروجی CSV (با محاسبات و رپشاژ)</button></div>');
  }

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const SPORTS = { football: 'فوتبال', futsal: 'فوتسال', volleyball: 'والیبال', basketball: 'بسکتبال', tennis: 'تنیس', wrestling: 'کشتی', custom: 'آزاد' };
  const STATUS = { setup: 'آماده‌سازی', ongoing: 'در حال برگزاری', done: 'به پایان رسید' };
  const MEDALS = ['🥇', '🥈', '🥉'];

  function avatar(team, size) {
    if (!team) return '<span class="avatar unknown">؟</span>';
    if (team.photo) return '<span class="avatar photo"><img src="' + team.photo + '" alt=""></span>';
    return '<span class="avatar" style="background:' + team.color + '">' + esc((team.name || '?').trim().charAt(0)) + '</span>';
  }
  function crest(team) {
    if (!team) return '<span class="crest unknown">؟</span>';
    if (team.photo) return '<span class="crest"><img src="' + team.photo + '" alt=""></span>';
    if (!team.color) return '<span class="crest unknown">' + esc((team.name || '?').trim().charAt(0)) + '</span>';
    return '<span class="crest" style="background:' + team.color + '">' + esc((team.name || '?').trim().charAt(0)) + '</span>';
  }
  function teamById(t, id) { return t.teams.find(x => x.id === id); }

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

  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 15); } catch (e) {} }

  const FABS = {
    home: null,
    bracket: { icon: '🎲', fn: () => UI.openDrawDialog() },
    teams: { icon: '＋', fn: () => UI.openTeamDialog() },
    matches: { icon: '🖼️', fn: () => Export.pngMatches() },
    stats: { icon: '🖼️', fn: () => Export.pngStats() },
    learn: { icon: '🎲', fn: () => UI.openDrawDialog() },
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
    const x = Math.max(0, r.left - br.left + 4), w = Math.max(8, r.width - 8);
    ind.style.transform = 'translateX(' + x + 'px) scaleX(' + w + 'px)';
  }

  function switchView(v) {
    view = v;
    if ($('views')) $('views').scrollTop = 0;
    document.querySelectorAll('#tabbar button').forEach(b => {
      const on = b.dataset.view === v;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    document.querySelectorAll('.view').forEach(s => s.classList.add('hidden'));
    $('view-' + v).classList.remove('hidden');
    render();
    updateFab();
    updateNavBadge();
    requestAnimationFrame(moveTabInd);
  }

  /* نشان تعداد بازی‌های ثبت‌نشده روی تب «بازی‌ها» */
  function updateNavBadge() {
    const t = Store.active();
    const btn = document.querySelector('#tabbar button[data-view="matches"]');
    if (!btn) return;
    let b = btn.querySelector('.nav-badge');
    if (!b) { b = document.createElement('span'); b.className = 'nav-badge'; btn.appendChild(b); }
    const n = t ? Engine.allMatches(t).filter(x => !x.m.hidden && x.m.status !== 'done' && x.m.a && x.m.b && x.m.a !== 'BYE' && x.m.b !== 'BYE').length : 0;
    b.textContent = Engine.faNum(n);
    b.classList.toggle('show', n > 0);
  }

  /* تم: تیره/روشن */
  function setTheme(th) {
    Store.db.theme = th === 'light' ? 'light' : 'dark';
    Store.save(); applyTheme(); syncThemeUI();
  }
  function toggleTheme() { setTheme((Store.db.theme || 'dark') === 'dark' ? 'light' : 'dark'); }
  function syncThemeUI() {
    const th = Store.db.theme || 'dark';
    const b = $('themeBtn');
    if (b) { b.textContent = th === 'dark' ? '🌙' : '☀️'; b.setAttribute('aria-label', th === 'dark' ? 'روشن کردن تم' : 'تیره کردن تم'); }
    document.querySelectorAll('.theme-opt').forEach(o => o.classList.toggle('active', o.dataset.themeOpt === th));
  }

  function render() {
    renderHeader(); renderDrawer();
    if (view === 'home') renderHome();
    else if (view === 'bracket') renderBracket();
    else if (view === 'teams') renderTeams();
    else if (view === 'matches') renderMatches();
    else if (view === 'stats') renderStats();
    else if (view === 'learn') renderLearn();
    else if (view === 'settings') renderSettings();
  }

  function renderHeader() {
    const t = Store.active();
    applyBrand(t);
    if (!t) {
      $('tournamentName').textContent = 'تورنمنتی نیست';
      $('tournamentMeta').textContent = 'از منو یک تورنمنت بساز یا انتخاب کن';
      if ($('heroDone')) { $('heroDone').textContent = '۰'; $('heroTotal').textContent = '۰'; $('heroBar').style.width = '0%'; }
      return;
    }
    $('tournamentName').textContent = t.name;
    const all = Engine.allMatches(t).filter(x => !x.m.hidden);
    const played = all.filter(x => x.m.status === 'done').length;
    const total = all.length;
    const seriesLbl = (t.settings.series || 1) > 1 ? 'بهترین از ' + Engine.faNum(t.settings.series) : 'تک‌بازی';
    const fmtLbl = Engine.isDouble(t) ? 'دو حذفی' : (Engine.isAsian(t) ? 'آسیایی' : Engine.isRoundRobin(t) ? 'دوره‌ای' : 'تک حذفی');
    $('tournamentMeta').textContent = (SPORTS[t.sport] || '') + '  /  ' + fmtLbl + '  /  ' + Engine.faNum(t.teams.length) + ' تیم  /  ' + seriesLbl;
    if ($('heroDone')) {
      $('heroDone').textContent = Engine.faNum(played);
      $('heroTotal').textContent = Engine.faNum(total);
      $('heroBar').style.width = (total ? Math.round(played / total * 100) : 0) + '%';
    }
  }

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
    if (!box) return;
    const all = Store.db.tournaments;
    box.innerHTML = all.length ? all.map(t =>
      '<div class="t-item' + (t.id === Store.db.activeId ? ' active' : '') + '" onclick="UI.selectTournament(\'' + t.id + '\')">' +
      '<div class="n">' + esc(t.name) + '</div><div class="m">' + Engine.faNum(t.teams.length) + ' تیم • ' + (STATUS[t.status] || '') + '</div></div>'
    ).join('') : '<p class="placeholder">تورنمنتی نیست.</p>';
  }
  function selectTournament(id) { Store.setActive(id); closeDrawer(); currentRound = 0; overviewOn = false; render(); }
  function openDrawer() { $('drawer').classList.add('open'); $('drawerOverlay').classList.remove('hidden'); }
  function closeDrawer() { $('drawer').classList.remove('open'); $('drawerOverlay').classList.add('hidden'); }

  /* ---------- خانه ---------- */
  function renderHome() {
    const t = Store.active();
    $('homeEmpty').classList.toggle('hidden', !!t);
    $('homeContent').classList.toggle('hidden', !t);
    if (!t) return;
    const all = Engine.allMatches(t).filter(x => !x.m.hidden);
    const done = all.filter(x => x.m.status === 'done').length;
    const pct = all.length ? Math.round(done / all.length * 100) : 0;
    $('homeStats').innerHTML =
      statCard(t.teams.length, 'تیم', t.teams.length, '👥') + statCard(all.length, 'بازی', all.length, '📅') +
      statCard(done, 'انجام‌شده', done, '✅') + statCard(pct + '٪', 'پیشرفت', null, '📈');
    countUp();
    const next = all.find(x => x.m.status !== 'done' && x.m.a && x.m.b && x.m.a !== 'BYE' && x.m.b !== 'BYE');
    const R = 30, C = 2 * Math.PI * R;
    const dash = document.createElement('div');
    dash.className = 'dash';
    dash.innerHTML =
      '<div class="dash-card"><svg class="ring" viewBox="0 0 74 74"><circle cx="37" cy="37" r="' + R + '" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="8"/>' +
      '<circle cx="37" cy="37" r="' + R + '" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + (C * pct / 100) + ' ' + C + '" transform="rotate(-90 37 37)"/>' +
      '<text x="37" y="43" text-anchor="middle" class="pct">' + pct + '٪</text></svg><div class="sub">پیشرفت تورنمنت</div></div>' +
      '<div class="dash-card gold"><div class="sub">' + (next ? esc(next.roundTitle) + ' • بازی ' + Engine.faNum(Engine.matchNumber(t, next.m.id)) : 'بازی بعدی') + '</div>' +
      '<div class="big">' + (next ? esc(Engine.teamName(t, next.m.a)) + ' ⚔️ ' + esc(Engine.teamName(t, next.m.b)) : '—') + '</div>' +
      '<div class="sub">' + (next ? countdownText(next.m) : 'همه بازی‌ها تمام شده 🎉') + '</div>' +
      (next ? '<div class="sub">' + esc([next.m.place, next.m.ref ? 'داور: ' + next.m.ref : ''].filter(Boolean).join(' • ') || 'مکان و داور ثبت نشده') + '</div>' +
      '<button class="action small u-mt-2" onclick="UI.openMatchDialog(\'' + next.m.id + '\')">✍️ ثبت نتیجه</button>' : '') + '</div>';
    const hc = $('homeContent');
    const old = hc.querySelector('.dash');
    if (old) old.remove();
    hc.insertBefore(dash, hc.firstChild);
    const sched = all.filter(x => x.m.status !== 'done' && x.m.a && x.m.b && x.m.a !== 'BYE' && x.m.b !== 'BYE').slice(0, 5);
    $('homeUpcoming').innerHTML = sched.length ? sched.map(x => matchRow(t, x.m, x.roundTitle)).join('') : '<p class="placeholder">بازی بعدی که ثبت شود، اینجا می‌بینی 📌</p>';
    const today = Engine.todayISO();
    const todays = all.filter(x => x.m.date === today);
    $('homeToday').innerHTML = todays.length ? todays.map(x => matchRow(t, x.m, x.roundTitle)).join('') : '<p class="placeholder">امروز بازی نداری؛ استراحت کن 😌</p>';
    const recent = all.filter(x => x.m.status === 'done' && x.m.result && x.m.result.type !== 'bye').slice(-5).reverse();
    $('homeRecent').innerHTML = recent.length ? recent.map(x => matchRow(t, x.m, x.roundTitle)).join('') : '<p class="placeholder">هنوز نتیجه‌ای ثبت نشده؛ اولین برد را بزن! ⚽</p>';
    // اکشن‌های سریع
    const q = $('homeQuick');
    if (q) {
      const nextId = next ? next.m.id : '';
      q.innerHTML =
        (nextId ? '<button class="quick-btn primary" onclick="UI.openMatchDialog(\'' + nextId + '\')"><span class="qi" aria-hidden="true">✍️</span>ثبت نتیجه</button>'
          : '<button class="quick-btn" onclick="UI.switchView(\'matches\')"><span class="qi" aria-hidden="true">📋</span>بازی‌ها</button>') +
        '<button class="quick-btn" onclick="UI.openDrawDialog()"><span class="qi" aria-hidden="true">🎲</span>قرعه‌کشی</button>' +
        '<button class="quick-btn" onclick="UI.openTeamDialog()"><span class="qi" aria-hidden="true">👥</span>افزودن تیم</button>' +
        '<button class="quick-btn" onclick="Export.png()"><span class="qi" aria-hidden="true">🖼️</span>خروجی عکس</button>';
    }
    // شمارنده بخش‌ها
    setCount('homeTodayTitle', todays.length);
    setCount('homeUpcomingTitle', sched.length);
    setCount('homeRecentTitle', recent.length);
  }
  function setCount(id, n) {
    const el = $(id);
    if (!el) return;
    let c = el.querySelector('.count');
    if (!c) { c = document.createElement('span'); c.className = 'count'; el.appendChild(c); }
    c.textContent = Engine.faNum(n);
  }
  const statCard = (v, l, n, ic) => '<div class="stat-card">' + (ic ? '<div class="ic" aria-hidden="true">' + ic + '</div>' : '') + '<div class="v"' + (n !== null && n !== undefined ? ' data-n="' + n + '"' : '') + '>' + (typeof v === 'number' ? Engine.faNum(v) : v) + '</div><div class="l">' + l + '</div></div>';

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

  function reducedMotion() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }
  function isLite() {
    try { return document.documentElement.dataset.lite === '1'; }
    catch (e) { return false; }
  }
  function applyPerfFlags() {
    try {
      const cores = navigator.hardwareConcurrency || 8;
      const mem = navigator.deviceMemory || 8;
      if (cores <= 4 || mem <= 4) document.documentElement.dataset.lite = '1';
    } catch (e) {}
  }
  function skelBars(n, h) {
    let s = '';
    for (let i = 0; i < n; i++) s += '<div class="skel skel-bar" style="height:' + (h || 54) + 'px"></div>';
    return s;
  }

  function countUp() {
    const instant = reducedMotion();
    document.querySelectorAll('#homeStats .v[data-n]').forEach(el => {
      const target = parseInt(el.dataset.n, 10) || 0;
      if (instant) { el.textContent = target.toLocaleString('fa-IR'); return; }
      const t0 = performance.now(), dur = 700;
      const step = now => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString('fa-IR');
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  function celebrate() {
    buzz([40, 40, 80]);
    if (reducedMotion() || isLite()) return;
    const cv = document.createElement('canvas');
    cv.id = 'confettiCv';
    cv.style.cssText = 'position:fixed;inset:0;z-index:300;pointer-events:none';
    cv.width = innerWidth; cv.height = innerHeight;
    document.body.appendChild(cv);
    const c = cv.getContext('2d');
    const colors = ['#c4f35b', '#eab308', '#2563eb', '#dc2626', '#fff'];
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

  /* کارت واحد بازی — سبک نمونه جدید */
  function teamDot(t, id) {
    const tm = id && id !== 'BYE' ? teamById(t, id) : null;
    return '<i class="tdot" style="background:' + ((tm && tm.color) || '#5b6675') + '"></i>';
  }
  function statusTag(m) {
    if (m.status === 'done') return '<span class="tag tag-done"><i></i>تمام‌شده</span>';
    if (m.date && m.date === Engine.todayISO()) return '<span class="tag tag-today"><i></i>امروز</span>';
    return '<span class="tag tag-soon"><i></i>زمان‌بندی‌شده</span>';
  }
  function statusPill(t, m) { return statusTag(m); }
  function todayISO() { return Engine.todayISO(); }
  function scorersLine(t, m) {
    if (!Array.isArray(m.scorers) || !m.scorers.length) return '';
    const top = [...m.scorers].sort((a, b) => (b.goals || 0) - (a.goals || 0)).slice(0, 3);
    return '<div class="scorers-line">⚽ ' + top.map(s => esc(s.name) + (s.goals > 1 ? ' ' + Engine.faNum(s.goals) : '')).join('، ') + '</div>';
  }
  function sideScore(t, m, side) {
    if (m.status !== 'done' || !m.result) return '−';
    if (m.result.type === 'bye') return '✓';
    if (m.result.type !== 'score') return side === (m.result.winner === m.a ? 'a' : 'b') ? '✓' : '';
    const ds = Engine.displayScore(m);
    return Engine.faNum(side === 'a' ? ds.a : ds.b);
  }
  function byeName(id, fallback) {
    if (id === 'BYE') return 'B (استراحت)';
    return fallback;
  }
  function matchRow(t, m, rt) {
    let aN = Engine.teamName(t, m.a), bN = Engine.teamName(t, m.b);
    if (m.a === 'BYE') aN = 'B (استراحت)';
    if (m.b === 'BYE') bN = 'B (استراحت)';
    const w = m.status === 'done' && m.result ? m.result.winner : null;
    const num = Engine.matchNumber(t, m.id);
    const tmA = m.a && m.a !== 'BYE' ? teamById(t, m.a) : null;
    const tmB = m.b && m.b !== 'BYE' ? teamById(t, m.b) : null;
    const meta = metaLine(t, m);
    const sched = m.status !== 'done';
    return '<div class="match-row match' + (m.status === 'done' ? ' done' : '') + '" onclick="UI.openMatchDialog(\'' + m.id + '\')">' +
      '<div class="sc-top">' + statusTag(m) +
      '<span class="sc-num">' + (num ? 'بازی ' + Engine.faNum(num) + ' • ' : '') + esc(rt || '') + '</span></div>' +
      '<div class="match-teams">' +
      '<div class="team-line' + (w === m.a ? ' winner' : '') + '">' + crest(tmA) + '<span class="tname">' + esc(aN) + '</span><span class="score-box">' + sideScore(t, m, 'a') + '</span></div>' +
      '<div class="team-line' + (w === m.b ? ' winner' : '') + '">' + crest(tmB) + '<span class="tname">' + esc(bN) + '</span><span class="score-box">' + sideScore(t, m, 'b') + '</span></div>' +
      '</div>' + scorersLine(t, m) +
      '<div class="match-foot"><span class="meta">' + esc(meta || 'در انتظار ثبت نتیجه') + '</span>' +
      (sched
        ? '<button class="action small' + (isNext(t, m) ? ' primary' : '') + '" onclick="event.stopPropagation();UI.openMatchDialog(\'' + m.id + '\')">ثبت نتیجه ←</button>'
        : '<button class="action small" onclick="event.stopPropagation();UI.openMatchDialog(\'' + m.id + '\')">جزئیات</button>') +
      '</div></div>';
  }
  function isNext(t, m) {
    if (!m || m.status === 'done') return false;
    const all = Engine.allMatches(t).filter(x => !x.m.hidden);
    const nx = all.find(x => x.m.status !== 'done' && x.m.a && x.m.b && x.m.a !== 'BYE' && x.m.b !== 'BYE');
    return nx && nx.m.id === m.id;
  }
  function scoreShort(t, m) {
    if (m.status !== 'done') return '–';
    if (m.result.type === 'bye') return '✓';
    if (m.result.type === 'draw') { const d = Engine.displayScore(m); return Engine.faNum(d.a) + ' - ' + Engine.faNum(d.b) + ' (مساوی)'; }
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

  /* ---------- جدول با تب مرحله‌ای ---------- */
  function zoom(d) { zoomLevel = Math.min(1.8, Math.max(0.5, Math.round((zoomLevel + d) * 10) / 10)); applyZoom(); saveZoom(); }
  function zoomReset() { zoomLevel = 1; applyZoom(); saveZoom(); }
  function applyZoom() { const b = $('bracket'); if (b) b.style.transform = 'scale(' + zoomLevel + ')'; }
  function saveZoom() { try { localStorage.setItem('jadval.zoom', String(zoomLevel)); } catch (e) {} }
  function loadZoom() { try { const z = parseFloat(localStorage.getItem('jadval.zoom')); if (z >= 0.5 && z <= 1.8) zoomLevel = z; } catch (e) {} }
  /* اسکرول افقی نمای کلی روی مرحلهٔ فعال */
  function focusStage() {
    const sc = $('bracketScroll'), tree = $('bracket');
    if (!sc || !tree) return;
    const r = tree.querySelector('.round[data-stage="' + currentRound + '"]');
    if (!r) return;
    try { r.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' }); }
    catch (e) { r.scrollIntoView(); }
  }

  function ensureCalc(t) {
    if (Engine.isDouble(t)) {
      if (!t.calc || t.calc.n !== t.teams.length || !t.calc.isDouble) {
        t.calc = Engine.deCalcInfo(t.teams.length);
        if (t.rounds.length) t.calc.slots = t.rounds[0].matches.length * 2;
      }
      return t.calc;
    }
    if (Engine.isAsian(t)) {
      if (!t.calc || t.calc.n !== t.teams.length) t.calc = Engine.asianCalcInfo(t.teams.length);
      return t.calc;
    }
    if (!t.calc || t.calc.n !== t.teams.length) t.calc = Engine.calcInfo(t.teams.length);
    return t.calc;
  }
  function drawMethodFa(t) {
    const m = t.drawMethod || 'lottery';
    if (m === 'seeding' || m === 'ranked') return 'سیدگذاری (ب)';
    if (m === 'combined' || m === 'pro') return 'ترکیبی (ج)' + (t.drawSeeded ? ' • ' + Engine.faNum(t.drawSeeded) + ' سید' : '');
    if (m === 'manual') return 'دستی';
    if (m === 'sequential') return 'ترتیبی';
    return 'قرعه‌کشی (الف)';
  }
  function calcPanelHtml(t) {
    if (Engine.isDouble(t)) return deCalcPanelHtml(t);
    if (Engine.isAsian(t)) return asianCalcPanelHtml(t);
    if (Engine.isRoundRobin(t)) return roundCalcPanelHtml(t);
    const c = ensureCalc(t);
    const byeDisp = (t.settings.byeDisplay || 'higher') === 'higher' ? 'توان بالاتر (با B)' : 'توان کمتر (بدون B)';
    return '<div class="panel pad calc-panel">' +
      '<div class="calc-head">' +
      '<strong>📐 محاسبات جدول (فصل دوم)</strong>' +
      '<span class="calc-method">روش: ' + esc(drawMethodFa(t)) + '</span></div>' +
      '<div class="calc-grid">' +
      '<span>مبنا: ' + Engine.faNum(c.base) + ' (۲ به توان ' + Engine.faNum(c.rounds) + ')</span>' +
      '<span>تعداد دور: ' + Engine.faNum(c.rounds) + '</span>' +
      '<span>کل مسابقات: ' + Engine.faNum(c.total) + ' (n−۱)</span>' +
      '<span>استراحت (B): ' + Engine.faNum(c.byes) + ' (' + Engine.faNum(c.base) + '−' + Engine.faNum(c.n) + ')</span>' +
      '<span>مسابقات دور اول: ' + Engine.faNum(c.firstMatches) + '</span>' +
      '<span>جمع جفت‌سید: ' + Engine.faNum(c.sum) + '</span>' +
      '</div>' +
      '<div class="calc-note">نمایش استراحت: ' + esc(byeDisp) + (c.byes ? ' • استراحت‌ها به سیدهای بالا رسید' : ' • بدون استراحت') + '</div></div>';
  }
  /* محاسبات و راهنمای جدول دو حذفی — فصل چهارم */
  function deCalcPanelHtml(t) {
    const c = ensureCalc(t);
    const byeDisp = (t.settings.byeDisplay || 'higher') === 'higher' ? 'توان بالاتر (با B)' : 'توان کمتر (بدون B)';
    return '<div class="panel pad calc-panel">' +
      '<div class="calc-head">' +
      '<strong>📐 محاسبات جدول دو حذفی (فصل چهارم)</strong>' +
      '<span class="calc-method">روش: ' + esc(drawMethodFa(t)) + '</span></div>' +
      '<div class="calc-grid">' +
      '<span>مبنا: ' + Engine.faNum(c.base) + ' (۲ به توان ' + Engine.faNum(c.rounds) + ')</span>' +
      '<span>استراحت (B): ' + Engine.faNum(c.byes) + '</span>' +
      '<span>مسابقات جدول برنده‌ها: ' + Engine.faNum(c.wbMatches) + '</span>' +
      '<span>مسابقات جدول بازنده‌ها: ' + Engine.faNum(c.lbMatches) + '</span>' +
      '<span>کل مسابقات: ' + Engine.faNum(c.total) + ' (۲n−۲)</span>' +
      '<span>فینال بزرگ: ۱ بازی</span>' +
      '</div>' +
      '<div class="calc-note">حذف با <strong>دو باخت</strong> • بازنده به جدول بازنده‌ها می‌رود؛ اگر قهرمان از جدول بازنده‌ها بیاید یک بازی بیشتر (۲n−۱) می‌شود.</div>' +
      '<div class="calc-note">نمایش استراحت: ' + esc(byeDisp) + (c.byes ? ' • B ها به برگهٔ پاک‌نویس منتقل می‌شوند' : ' • بدون استراحت') + '</div></div>';
  }
  /* محاسبات و راهنمای جدول آسیایی — فصل سوم */
  function asianCalcPanelHtml(t) {
    const c = ensureCalc(t);
    const byeDisp = (t.settings.byeDisplay || 'higher') === 'higher' ? 'توان بالاتر (با B)' : 'توان کمتر (بدون B)';
    return '<div class="panel pad calc-panel">' +
      '<div class="calc-head">' +
      '<strong>📐 محاسبات جدول آسیایی (فصل سوم)</strong>' +
      '<span class="calc-method">روش: ' + esc(drawMethodFa(t)) + '</span></div>' +
      '<div class="calc-grid">' +
      '<span>مبنا: ' + Engine.faNum(c.base) + ' (۲ به توان ' + Engine.faNum(c.rounds) + ')</span>' +
      '<span>مسابقات دور اول: ' + Engine.faNum(c.firstMatches) + '</span>' +
      '<span>جدول جلو (مقام ۱ تا ' + Engine.faNum(c.front) + '): ' + Engine.faNum(c.front) + ' تیم</span>' +
      '<span>پشت جدول (مقام ' + Engine.faNum(c.front + 1) + ' تا ' + Engine.faNum(c.base) + '): ' + Engine.faNum(c.back) + ' تیم</span>' +
      '<span>کل بازی‌ها (رتبه‌بندی کامل): ' + Engine.faNum(c.total) + '</span>' +
      '<span>بازی‌های واقعی (بدون استراحت): ' + Engine.faNum(c.played) + '</span>' +
      '</div>' +
      '<div class="calc-note">بازندگان از دور خارج نمی‌شوند؛ هر بازنده فقط برای بهترین مقام همان دور رقابت می‌کند (فصل ۳).</div>' +
      '<div class="calc-note">نمایش استراحت: ' + esc(byeDisp) + (c.byes ? ' • ' + Engine.faNum(c.byes) + ' استراحت (B)' : ' • بدون استراحت') + '</div></div>';
  }
  /* محاسبات و راهنمای جدول دوره‌ای — فصل پنجم */
  function roundCalcPanelHtml(t) {
    const c = Engine.roundCalcInfo(Math.max(2, t.teams.length));
    const P = (t.settings && t.settings.points) || { win: 3, draw: 1, loss: 0 };
    return '<div class="panel pad calc-panel">' +
      '<div class="calc-head">' +
      '<strong>📐 محاسبات جدول دوره‌ای (فصل پنجم)</strong>' +
      '<span class="calc-method">روش: ' + esc(drawMethodFa(t)) + '</span></div>' +
      '<div class="calc-grid">' +
      '<span>تعداد دور: ' + Engine.faNum(c.rounds) + (c.odd ? ' (چون تعداد شرکت‌کنندگان فرد است)' : ' (n−۱)') + '</span>' +
      '<span>مسابقه در هر دور: ' + Engine.faNum(c.perRound) + '</span>' +
      '<span>مسابقات هر تیم: ' + Engine.faNum(c.perTeam) + ' (n−۱)</span>' +
      '<span>کل مسابقات: ' + Engine.faNum(c.total) + ' (n(n−۱)÷۲)</span>' +
      '<span>امتیاز: برد ' + Engine.faNum(P.win || 0) + ' • مساوی ' + Engine.faNum(P.draw || 0) + ' • باخت ' + Engine.faNum(P.loss || 0) + '</span>' +
      '</div>' +
      '<div class="calc-note">همهٔ شرکت‌کنندگان در یک گروه با هم بازی می‌کنند؛ نتیجه می‌تواند مساوی باشد.</div></div>';
  }
  /* جدول ثبت نتایج گروه — فصل پنجم */
  function leagueTableHtml(t) {
    const tbl = Engine.leagueTable(t);
    const unit = t.settings.scoring === 'sets' ? 'ست' : t.settings.scoring === 'points' ? 'امتیاز' : 'گل';
    const P = (t.settings && t.settings.points) || { win: 3, draw: 1, loss: 0 };
    if (!tbl.length) return '<p class="placeholder">تیمی در گروه نیست.</p>';
    return '<div class="panel pad league-panel">' +
      '<div class="calc-head"><strong>📊 جدول ثبت نتایج گروه</strong>' +
      '<span class="calc-method">امتیاز: برد ' + Engine.faNum(P.win || 0) + ' • مساوی ' + Engine.faNum(P.draw || 0) + ' • باخت ' + Engine.faNum(P.loss || 0) + '</span></div>' +
      '<div class="table-scroll"><table class="stats league-table">' +
      '<thead><tr><th>رتبه</th><th>تیم</th><th>بازی</th><th>برد</th><th>باخت</th><th>مساوی</th>' +
      '<th>' + unit + ' زده</th><th>' + unit + ' خورده</th><th>تفاضل</th><th>امتیاز</th></tr></thead><tbody>' +
      tbl.map(r => {
        const tm = teamById(t, r.id);
        return '<tr class="' + (r.rank === 1 ? 'first' : '') + '">' +
          '<td class="pos">' + (r.rank <= 3 ? MEDALS[r.rank - 1] + ' ' : '') + Engine.faNum(r.rank) + '</td>' +
          '<td class="tm-cell">' + crest(tm) + '<span>' + esc(r.name) + '</span></td>' +
          '<td>' + Engine.faNum(r.played) + '</td>' +
          '<td>' + Engine.faNum(r.won) + '</td>' +
          '<td>' + Engine.faNum(r.lost) + '</td>' +
          '<td>' + Engine.faNum(r.drawn) + '</td>' +
          '<td>' + Engine.faNum(r.gf) + '</td>' +
          '<td>' + Engine.faNum(r.ga) + '</td>' +
          '<td>' + Engine.faNum(r.gd) + '</td>' +
          '<td><strong>' + Engine.faNum(r.pts) + '</strong></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="note-xs">مرتب‌سازی: جمع امتیاز ← تفاضل ← ' + unit + ' زده. هر مسابقه دو خانه (نتیجهٔ هر تیم) را در جدول پر می‌کند.</p></div>';
  }
  /* فهرست مراحل قابل نمایش: تک‌حذفی = دورها؛ دو‌حذفی = دورهای برنده + سطوح بازنده + فینال بزرگ؛ آسیایی = جدول جلو + رتبه‌بندی + پشت جدول */
  function stageList(t) {
    if (Engine.isRoundRobin(t)) {
      const out = t.rounds.map(rd => ({ title: rd.title, matches: rd.matches, kind: 'rr' }));
      out.push({ title: '📊 جدول ثبت نتایج گروه', matches: [], kind: 'table' });
      return out;
    }
    if (Engine.isAsian(t)) {
      const out = t.rounds.map(rd => ({ title: rd.title, matches: rd.matches, kind: 'wb' }));
      const place = [], back = [];
      (t.asianRounds || []).forEach(rd => {
        const arr = rd.kind === 'back' ? back : place;
        rd.matches.forEach(m => arr.push(m));
      });
      if (place.length) out.push({ title: '🏅 تعیین مقام‌ها (۳ و ۴ به بعد)', matches: place, kind: 'place', perMatch: true });
      if (back.length) out.push({ title: '🔙 پشت جدول', matches: back, kind: 'lb', perMatch: true });
      return out;
    }
    if (!Engine.isDouble(t)) return t.rounds.map(rd => ({ title: rd.title, matches: rd.matches, kind: 'wb' }));
    const out = t.rounds.map(rd => ({ title: rd.title, matches: rd.matches, kind: 'wb' }));
    (t.lbRounds || []).forEach(rd => out.push({ title: rd.title, matches: rd.matches.filter(m => !m.hidden), kind: 'lb' }));
    if (t.gf) out.push({ title: '🏆 فینال بزرگ', matches: [t.gf], kind: 'gf' });
    return out;
  }
  function isByeMatch(m) { return m && m.result && m.result.type === 'bye'; }
  function filteredRoundMatches(t, rd, r, stage) {
    let list = rd.matches;
    if (stage && stage.kind !== 'wb') list = rd.matches;
    else if ((t.settings.byeDisplay || 'higher') === 'lower' && r === 0) {
      const real = rd.matches.filter(m => !isByeMatch(m));
      if (real.length) list = real;
    }
    // فیلتر مرحله
    if (stageFilter === 'done') list = list.filter(m => m.status === 'done');
    else if (stageFilter === 'scheduled') list = list.filter(m => m.status !== 'done');
    else if (stageFilter === 'today') list = list.filter(m => m.date === Engine.todayISO());
    return list;
  }
  function setStageFilter(f) {
    stageFilter = f;
    renderBracket();
  }
  function renderStageChips(t, stg) {
    const box = $('stageChips');
    if (!box) return;
    if (!stg) { box.classList.add('hidden'); return; }
    const all = stg.matches;
    const today = Engine.todayISO();
    const defs = [
      ['all', 'همه', all.length],
      ['done', 'انجام‌شده', all.filter(m => m.status === 'done').length],
      ['scheduled', 'ثبت‌نشده', all.filter(m => m.status !== 'done').length],
      ['today', 'امروز', all.filter(m => m.date === today).length]
    ];
    box.classList.remove('hidden');
    box.innerHTML = defs.map(d =>
      '<button class="chip' + (stageFilter === d[0] ? ' active' : '') + '" onclick="UI.setStageFilter(\'' + d[0] + '\')">' + d[1] + '<span class="n">' + Engine.faNum(d[2]) + '</span></button>'
    ).join('');
  }

  function renderBracket() {
    const t = Store.active();
    const has = t && t.rounds.length;
    $('bracketEmpty').classList.toggle('hidden', !!has);
    const body = $('bracketBody');
    if (body) body.classList.toggle('hidden', !has);
    if (!has) {
      if (t && !t.teams.length) { const p = $('bracketEmpty').querySelector('p'); if (p) p.textContent = 'اول تیم‌ها را ثبت کن، بعد قرعه‌کشی کن.'; }
      renderHeader();
      return;
    }
    ensureCalc(t);
    const stages = stageList(t);
    if (currentRound < 0 || currentRound >= stages.length) currentRound = stages.length - 1;

    // تب‌ها
    const tabs = $('roundTabs');
    tabs.classList.toggle('de-tabs', Engine.isDouble(t));
    tabs.innerHTML = stages.map((stg, r) => {
      const tot = stg.matches.length;
      const dn = stg.matches.filter(m => m.status === 'done').length;
      const st = tot && dn === tot ? 'تمام‌شده' : (dn > 0 ? 'در جریان' : 'پیش رو');
      const cls = r === currentRound && !overviewOn && bracketMode !== 'list' ? ' active' : '';
      const lb = (stg.kind === 'lb' || stg.kind === 'place') ? ' lb-tab' : (stg.kind === 'gf' ? ' gf-tab' : '');
      const full = tot && dn === tot ? ' done' : '';
      return '<button class="round-tab' + lb + cls + full + '" role="tab" aria-selected="' + (r === currentRound) + '" onclick="UI.showRound(' + r + ')">' +
        '<span class="rt">' + esc(stg.title) + '</span><small>' + Engine.faNum(dn) + '/' + Engine.faNum(tot) + ' • ' + st + '</small>' +
        '<span class="stage-prog" aria-hidden="true"><i style="width:' + (tot ? Math.round(dn / tot * 100) : 0) + '%"></i></span></button>';
    }).join('');
    requestAnimationFrame(() => {
      const act = tabs.querySelector('.round-tab.active');
      if (act && tabs.scrollWidth > tabs.clientWidth) act.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    // راهنما
    const hint = $('roundHintText');
    if (hint) {
      if (Engine.isRoundRobin(t)) {
        const k = stages[currentRound].kind;
        if (k === 'table') hint.textContent = 'مقام‌ها بر اساس جمع امتیاز، سپس تفاضل نتایج تعیین می‌شود';
        else hint.textContent = 'همهٔ شرکت‌کنندگان در هر دور با هم بازی می‌کنند؛ نتیجه می‌تواند مساوی باشد';
      }
      else if (Engine.isAsian(t)) {
        const k = stages[currentRound].kind;
        if (k === 'wb') hint.textContent = 'برنده به دور بعد می‌رود؛ بازنده به گروه رتبه‌بندیِ همان سطح می‌رود';
        else if (k === 'place') hint.textContent = 'برندهٔ این گروه، بالاترین مقامِ همین گروه را می‌گیرد';
        else hint.textContent = 'پشت جدول: بازندگان دور اول برای نیمهٔ پایین مقام‌ها رقابت می‌کنند';
      }
      else if (currentRound >= stages.length - 1) hint.textContent = 'برندهٔ فینال بزرگ قهرمان می‌شود 🏆';
      else if (Engine.isDouble(t) && stages[currentRound].kind === 'wb') hint.textContent = 'برنده به دور بعد می‌رود؛ بازنده به جدول بازنده‌ها منتقل می‌شود';
      else hint.textContent = 'برندهٔ هر بازی به ' + stages[currentRound + 1].title + ' می‌رود';
    }
    const ol = $('overviewBtnLabel');
    if (ol) ol.textContent = overviewOn ? 'نمای مرحله‌ای' : 'کل مسیر';

    const rp = $('roundPanels'), sc = $('bracketScroll'), bl = $('bracketList'), tb = $('bracketToolbar');
    const tp = Engine.isDouble(t) ? null : t.thirdPlace, tpb = $('thirdPlaceBox');
    const chips = $('stageChips');
    if (bracketMode === 'list') {
      if (chips) chips.classList.add('hidden');
      rp.classList.add('hidden'); sc.classList.add('hidden'); bl.classList.remove('hidden'); tb.classList.remove('hidden');
      let lastRt = '';
      bl.innerHTML = calcPanelHtml(t) + repechageBoxHtml(t) + Engine.allMatches(t).filter(x => !x.m.hidden).map(x => {
        const h = x.roundTitle !== lastRt ? '<h3 class="block-title">' + esc(x.roundTitle) + '</h3>' : '';
        lastRt = x.roundTitle;
        return h + matchRow(t, x.m, x.roundTitle);
      }).join('');
      if (tp) { tpb.classList.remove('hidden'); tpb.innerHTML = '<h3 class="block-title">بازی رده‌بندی</h3>' + matchRow(t, tp, 'سوم / چهارم'); }
      else if (t.repechage) { tpb.classList.remove('hidden'); tpb.innerHTML = repechageBoxHtml(t); }
      else tpb.classList.add('hidden');
      return;
    }
    if (overviewOn) {
      if (chips) chips.classList.add('hidden');
      rp.classList.add('hidden'); bl.classList.add('hidden'); sc.classList.remove('hidden'); tb.classList.remove('hidden');
      paintTree(t);
      applyZoom();
      requestAnimationFrame(focusStage);
      if (t.repechage) { tpb.classList.remove('hidden'); tpb.innerHTML = repechageBoxHtml(t); }
      else if (tp) { tpb.classList.remove('hidden'); tpb.innerHTML = '<h3 class="block-title">بازی رده‌بندی</h3>' + matchRow(t, tp, 'سوم / چهارم'); }
      else tpb.classList.add('hidden');
      return;
    }
    // نمای مرحله‌ای
    bl.classList.add('hidden'); sc.classList.add('hidden'); tb.classList.add('hidden');
    rp.classList.remove('hidden');
    const stg = stages[currentRound];
    /* مرحلهٔ جدول ثبت نتایج (جدول دوره‌ای) */
    if (stg.kind === 'table') {
      if (chips) chips.classList.add('hidden');
      rp.innerHTML = calcPanelHtml(t) + leagueTableHtml(t);
      if (tp) { tpb.classList.remove('hidden'); tpb.innerHTML = '<h3 class="block-title">بازی رده‌بندی</h3>' + matchRow(t, tp, 'سوم / چهارم'); }
      else tpb.classList.add('hidden');
      return;
    }
    renderStageChips(t, stg);
    const rd = { title: stg.title, matches: stg.matches };
    const showMatches = filteredRoundMatches(t, rd, currentRound, stg);
    const emptyFilter = !showMatches.length && rd.matches.length ? '<p class="placeholder">با این فیلتر بازی‌ای در این مرحله نیست 🔍</p>' : '';
    const byeNote = ((t.settings.byeDisplay || 'higher') === 'lower' && currentRound === 0 && !Engine.isDouble(t) && showMatches.length !== rd.matches.length)
      ? '<p class="note-xs">روش توان کمتر: ' + Engine.faNum(rd.matches.length - showMatches.length) + ' بازی استراحت (B) نمایش داده نشد؛ برندگان استراحت مستقیم در دور بعد‌اند.</p>' : '';
    let html = calcPanelHtml(t) + repechageBoxHtml(t) + byeNote + emptyFilter + '<div class="match-cards">' + showMatches.map(m => matchRow(t, m, stg.perMatch ? (m.title || rd.title) : rd.title)).join('') + '</div>';
    const lastWb = Engine.isAsian(t)
      ? stages.reduce((acc, s, i) => (s.kind === 'wb' ? i : acc), -1)
      : stages.length - 1;
    if (currentRound < stages.length - 1) {
      const nxT = stages[currentRound + 1].title;
      const nums = rd.matches.map(m => Engine.matchNumber(t, m.id)).filter(Boolean);
      const rng = Engine.isDouble(t)
        ? 'مرحله بعد: ' + nxT
        : (nums.length ? 'برندهٔ بازی ' + Engine.faNum(Math.min.apply(null, nums)) + ' مقابل برندهٔ بازی ' + Engine.faNum(Math.max.apply(null, nums)) : 'برندگان این مرحله');
      html += '<div class="path-join" aria-hidden="true"></div>' +
        '<button class="next-card" onclick="UI.showRound(' + (currentRound + 1) + ')"><span class="next-ic">🏆</span>' +
        '<span><h4>مقصد بعدی: ' + esc(nxT) + '</h4><p>' + esc(rng) + '</p></span><span class="next-arrow">◀</span></button>';
    }
    if (currentRound === lastWb) {
      const champ = t.champion ? teamById(t, t.champion) : null;
      html += '<div class="panel pad champ-box">' +
        '<div class="champion-emblem">🏆</div>' +
        '<h3>' + (champ ? esc(champ.name) : 'جام در انتظار قهرمان') + '</h3>' +
        '<p>' + (champ ? 'قهرمان ' + esc(t.name) : 'برندهٔ فینال اینجا معرفی می‌شود.') + '</p></div>';
    }
    rp.innerHTML = html;
    if (tp && currentRound >= t.rounds.length - 2) { tpb.classList.remove('hidden'); tpb.innerHTML = '<h3 class="block-title">بازی رده‌بندی</h3>' + matchRow(t, tp, 'سوم / چهارم'); }
    else tpb.classList.add('hidden');
  }

  function paintTree(t) {
    const treeHtml = stageList(t).map((stg, r) => {
      if (stg.kind === 'table') return '';
      const tot = stg.matches.length, dn = stg.matches.filter(m => m.status === 'done').length;
      const badge = '<span class="badge' + (tot && dn === tot ? ' full' : '') + '">' + Engine.faNum(dn) + '/' + Engine.faNum(tot) + '</span>';
      return '<div class="round' + (stg.kind === 'lb' || stg.kind === 'place' ? ' lb-round' : '') + (stg.kind === 'gf' ? ' gf-round' : '') + '" data-stage="' + r + '">' +
        '<div class="round-title">' + esc(stg.title) + badge + '</div><div class="round-matches">' +
        stg.matches.map(m => bmatch(t, m)).join('') + '</div></div>';
    }).join('');
    const paint = () => { $('bracket').innerHTML = treeHtml; };
    const totalM = t.rounds.reduce((n, rd) => n + rd.matches.length, 0);
    if (totalM > 8 && !reducedMotion()) {
      $('bracket').innerHTML = '<div class="skel-wrap">' + skelBars(6, 64) + '</div>';
      requestAnimationFrame(() => requestAnimationFrame(paint));
    } else paint();
  }

  /* باکس رپشاژ (شانس مجدد) — فصل دوم */
  function repechageBoxHtml(t) {
    if (Engine.isDouble(t)) return '';
    if (!t.champion) return '';
    const f = Engine.finalists(t);
    if (!f) return '';
    if (t.repechage) {
      const r = t.repechage;
      const row = (ids) => ids.length ? ids.map(id => esc(Engine.teamName(t, id))).join('، ') : '—';
      const third = r.third.length ? r.third.map(id => esc(Engine.teamName(t, id))).join(' و ') : 'هنوز مشخص نشده';
      let inner = '<div class="panel pad repe-panel">' +
        '<div class="repe-head"><strong>🥉 جدول شانس مجدد (رپشاژ)</strong>' +
        '<button class="action small" onclick="UI.clearRepechage()">حذف رپشاژ</button></div>' +
        '<div class="repe-sum">دسته بازندگان به قهرمان (' + esc(Engine.teamName(t, r.champion)) + '): ' + row(r.champLosers) +
        '<br>دسته بازندگان به نایب‌قهرمان (' + esc(Engine.teamName(t, r.runner)) + '): ' + row(r.runnerLosers) +
        '<br>سوم مشترک: <strong>' + third + '</strong></div>';
      ['champ', 'runner'].forEach(g => {
        const br = r[g === 'champ' ? 'champBracket' : 'runnerBracket'];
        if (!br || !br.rounds.length) {
          if ((g === 'champ' ? r.champLosers : r.runnerLosers).length === 1) {
            inner += '<p class="repe-single">دسته ' + (g === 'champ' ? 'قهرمان' : 'نایب‌قهرمان') + ': تک‌نفره، بدون مسابقه.</p>';
          }
          return;
        }
        inner += '<h4 class="repe-sub">دسته ' + (g === 'champ' ? 'بازندگان به قهرمان' : 'بازندگان به نایب‌قهرمان') + '</h4><div class="stack">';
        br.rounds.forEach(rd => rd.matches.forEach(m => { inner += repRow(t, g, m); }));
        inner += '</div>';
      });
      if (r.playoff) {
        inner += '<h4 class="repe-sub">پل‌آف سوم 🥉</h4><div class="stack">' + repRow(t, 'playoff', r.playoff) + '</div>';
      }
      inner += '</div>';
      return inner;
    }
    // پیشنهاد ساخت رپشاژ (کشتی/رزمی یا وقتی سیدگذاری کامل نبود)
    return '<div class="panel pad repe-panel">🥉 فینال تمام شد. برای جبران بدشانسی قرعه (مخصوص کشتی/رزمی): بازندگان به قهرمان و نایب‌قهرمان می‌توانند برای <strong>سوم مشترک</strong> بجنگند.<div class="modal-btns"><button class="action" onclick="UI.buildRepechage()">ساخت جدول شانس مجدد (رپشاژ)</button></div></div>';
  }
  function repRow(t, g, m) {
    const aN = Engine.teamName(t, m.a), bN = Engine.teamName(t, m.b);
    const w = m.status === 'done' && m.result ? m.result.winner : null;
    return '<div class="match-row' + (m.status === 'done' ? ' done' : '') + '">' +
      '<div class="sc-top"><span class="tag ' + (m.status === 'done' ? 'tag-done' : 'tag-soon') + '">' + (m.status === 'done' ? 'تمام‌شده' : 'شانس مجدد') + '</span>' +
      '<span class="sc-num">رپشاژ</span></div>' +
      '<div class="match-teams">' +
      '<div class="team-line' + (w === m.a ? ' winner' : '') + '">' + crest(teamById(t, m.a)) + '<span class="tname">' + esc(aN) + '</span></div>' +
      '<div class="team-line' + (w === m.b ? ' winner' : '') + '">' + crest(teamById(t, m.b)) + '<span class="tname">' + esc(bN) + '</span></div></div>' +
      '<div class="match-foot"><span class="meta">' + (w ? 'برنده: ' + esc(Engine.teamName(t, w)) : 'در انتظار') + '</span>' +
      ((m.a && m.b && m.a !== 'BYE' && m.b !== 'BYE' && m.status !== 'done') || (m.status === 'done')
        ? '<span><button class="action small" onclick="UI.pickRepWinner(\'' + g + '\',\'' + m.id + '\',\'' + m.a + '\')">' + esc(aN.slice(0, 12)) + ' برد</button> ' +
          '<button class="action small" onclick="UI.pickRepWinner(\'' + g + '\',\'' + m.id + '\',\'' + m.b + '\')">' + esc(bN.slice(0, 12)) + ' برد</button></span>'
        : '<span class="meta">✓ استراحت</span>') +
      '</div></div>';
  }
  function buildRepechage() {
    const t = Store.active(); if (!t) return;
    if (Engine.buildRepechage(t)) { buzz(25); render(); }
  }
  function pickRepWinner(g, mid, wid) {
    const t = Store.active(); if (!t) return;
    if (Engine.setRepechageResult(t, g, mid, wid)) { buzz(15); render(); }
  }
  function clearRepechage() {
    const t = Store.active(); if (!t) return;
    if (!confirm('جدول شانس مجدد پاک شود؟')) return;
    Engine.clearRepechage(t); render();
  }

  function bmatch(t, m) {
    const w = m.status === 'done' && m.result ? m.result.winner : null;
    const ds = Engine.displayScore(m);
    const fmt = v => (v === null || v === undefined || v === '' ? '' : Engine.faNum(v));
    const side = (id, key) => {
      const tm = id && id !== 'BYE' ? teamById(t, id) : null;
      const isB = id === 'BYE';
      const nm = !id ? '...' : isB ? 'B (استراحت)' : (tm ? tm.name : 'حذف‌شده');
      return '<div class="bm-team' + (w === id && id && id !== 'BYE' ? ' w' : (m.status === 'done' && id && id !== 'BYE' ? ' l' : '')) + (isB ? ' bye' : '') + '>' +
        (isB ? '<span class="avatar bye">B</span>' : (tm ? avatar(tm) : '<span class="avatar unknown">؟</span>')) +
        '<span class="nm">' + esc(nm) + '</span>' +
        '<span class="sc">' + esc(String(key === null || key === undefined ? '' : key)) + '</span></div>';
    };
    let mid;
    if (m.status !== 'done') mid = '<div class="bm-vs">در انتظار</div>';
    else if (!m.result || m.result.type === 'bye') mid = '<div class="bm-vs">✓ صعود با استراحت (B)</div>';
    else if (m.result.type !== 'score') mid = '<div class="bm-vs">' + (m.result.type === 'walkover' ? 'انصراف حریف' : 'حذف انضباطی') + '</div>';
    else mid = '<div class="bm-vs">' + esc(Export.scoreText(t, m)) + '</div>';
    return '<div class="bmatch' + (m.status === 'done' ? ' done' : '') + '" onclick="UI.openMatchDialog(\'' + m.id + '\')">' +
      side(m.a, fmt(ds.a)) + mid + side(m.b, fmt(ds.b)) +
      '<div class="bm-info">بازی ' + Engine.faNum(Engine.matchNumber(t, m.id)) + ' • ' + esc(metaLine(t, m)) + (m.locked ? ' 🔒' : '') + '</div></div>';
  }

  function emptyState(icon, title, sub, btn, act) {
    return '<div class="empty"><div class="empty-icon">' + icon + '</div>' +
      '<div class="empty-title">' + title + '</div>' +
      (sub ? '<p>' + sub + '</p>' : '') +
      (btn ? '<button class="action primary" onclick="' + act + '">' + btn + '</button>' : '') + '</div>';
  }

  /* ---------- تیم‌ها ---------- */
  function hasUpcoming(t, teamId) {
    return Engine.allMatches(t).some(x => x.m.status !== 'done' && (x.m.a === teamId || x.m.b === teamId));
  }
  function renderTeams() {
    const t = Store.active();
    if (!t) { $('teamsList').innerHTML = '<p>تورنمنتی انتخاب نشده.</p>'; return; }
    $('teamsCount').innerHTML = 'تیم‌ها <span class="count-accent">' + Engine.faNum(t.teams.length) + '</span>';
    const q = (($('teamSearch') && $('teamSearch').value) || '').trim();
    const list = t.teams.filter(tm => !q || tm.name.includes(q) || (tm.coach || '').includes(q));
    // مرتب‌سازی
    const rec = tm => (t.rounds.length ? Engine.record(t, tm.id) : null);
    const SORTS = [['seed', 'سید'], ['name', 'نام'], ['won', 'برد'], ['lost', 'باخت']];
    const sb = $('teamSort');
    if (sb) {
      sb.innerHTML = '<span class="note-xs m-0">مرتب‌سازی:</span>' + SORTS.map(s =>
        '<button class="chip' + (teamSort === s[0] ? ' active' : '') + '" onclick="UI.setTeamSort(\'' + s[0] + '\')">' + s[1] + '</button>').join('');
    }
    const sorted = list.slice().sort((x, y) => {
      if (teamSort === 'name') return x.name.localeCompare(y.name, 'fa');
      if (teamSort === 'won') { const a = rec(x) || { won: 0 }, b = rec(y) || { won: 0 }; return b.won - a.won || x.name.localeCompare(y.name, 'fa'); }
      if (teamSort === 'lost') { const a = rec(x) || { lost: 0 }, b = rec(y) || { lost: 0 }; return a.lost - b.lost || x.name.localeCompare(y.name, 'fa'); }
      return (parseInt(x.rank, 10) || 999) - (parseInt(y.rank, 10) || 999) || x.name.localeCompare(y.name, 'fa');
    });
    $('teamsList').innerHTML = sorted.length ? sorted.map(tm => {
      const r = t.rounds.length ? Engine.record(t, tm.id) : null;
      const st = !t.rounds.length ? '<span class="team-status out">سید ' + Engine.faNum(tm.rank || '—') + '</span>'
        : t.champion === tm.id ? '<span class="team-status up">قهرمان 🏆</span>'
        : (r && r.lost > 0 && !hasUpcoming(t, tm.id) ? '<span class="team-status out">حذف‌شده</span>' : '<span class="team-status up">در جام</span>');
      // فرم اخیر بازی‌ها
      let form = '';
      if (r && t.rounds.length) {
        const ms = Engine.allMatches(t).filter(x => !x.m.hidden && x.m.status === 'done' && (x.m.a === tm.id || x.m.b === tm.id)).slice(-5);
        if (ms.length) form = '<div class="form-pills" aria-label="فرم اخیر">' + ms.map(x =>
          '<span class="form-pill ' + (x.m.result && x.m.result.winner === tm.id ? 'w' : 'l') + '"></span>').join('') + '</div>';
      }
      return '<div class="team-row" data-tm="' + tm.id + '">' + crest(tm) +
        '<div class="info"><div class="n">' + esc(tm.name) + '</div><div class="m">' +
        (tm.coach ? 'مربی: ' + esc(tm.coach) + ' • ' : '') + (tm.rank ? 'سید ' + Engine.faNum(tm.rank) + ' • ' : '') +
        (r ? Engine.faNum(r.won) + ' برد - ' + Engine.faNum(r.lost) + ' باخت' : 'بدون بازی') + '</div>' + form + '</div>' + st +
        '<div class="acts"><button class="mini" aria-label="ویرایش ' + esc(tm.name) + '" onclick="UI.openTeamDialog(\'' + tm.id + '\')">✏️</button>' +
        '<button class="mini" aria-label="حذف ' + esc(tm.name) + '" onclick="UI.removeTeam(\'' + tm.id + '\')">🗑️</button></div></div>';
    }).join('') : (q ? '<div class="empty"><div class="empty-icon">🔍</div><div class="empty-title">چیزی پیدا نشد</div><p>اسم دیگری را امتحان کن</p></div>'
      : emptyState('👥', 'هنوز تیمی ثبت نشده', 'اسامی تیم‌ها را اضافه کن تا بریم سر قرعه‌کشی 🎲', '＋ افزودن تیم', 'UI.openTeamDialog()'));
  }
  function setTeamSort(s) { teamSort = s; renderTeams(); }
  function removeTeam(id) {
    const t = Store.active(); if (!t) return;
    if (!confirm('تیم حذف شود؟')) return;
    closeModal();
    Store.removeTeam(t.id, id); render();
  }
  function openQuickMenu(teamId) {
    const t = Store.active(); if (!t) return;
    const tm = teamById(t, teamId); if (!tm) return;
    openModal('<div class="quick-menu"><div class="q-name">' + esc(tm.name) + '</div>' +
      '<div class="q-sub">' + esc((tm.coach ? 'مربی: ' + tm.coach + ' • ' : '') + (tm.rank ? 'سید ' + Engine.faNum(tm.rank) : 'بدون سید')) + '</div>' +
      '<div class="modal-btns"><button class="action primary" onclick="UI.closeModal();UI.openTeamDialog(\'' + tm.id + '\')">✏️ ویرایش</button>' +
      '<button class="action danger" onclick="UI.removeTeam(\'' + tm.id + '\')">🗑️ حذف</button></div>' +
      '<div class="modal-btns"><button class="action" onclick="UI.closeModal()">بستن</button></div></div>');
  }

  /* ---------- مسابقات ---------- */
  function renderMatches() {
    const t = Store.active();
    if (!t || !t.rounds.length) { $('matchesList').innerHTML = emptyState('📋', 'بازی‌ای اینجا نیست', 'اول قرعه‌کشی کن تا بازی‌ها ساخته شوند ✨', '🎲 قرعه‌کشی', 'UI.openDrawDialog()'); return; }
    const f = $('matchFilter').value;
    const q2 = (($('matchSearch') && $('matchSearch').value) || '').trim();
    let lastRt = '';
    const list = Engine.allMatches(t).filter(x => !x.m.hidden);
    // بازی‌های شانس مجدد (رپشاژ) هم در فهرست بازی‌ها می‌آیند
    if (t.repechage) {
      ['champ', 'runner'].forEach(g => {
        const br = t.repechage[g === 'champ' ? 'champBracket' : 'runnerBracket'];
        if (br && br.rounds) br.rounds.forEach(rd => rd.matches.forEach(m => list.push({ roundTitle: 'رپشاژ', m })));
      });
      if (t.repechage.playoff) list.push({ roundTitle: 'پل‌آف سوم', m: t.repechage.playoff });
    }
    // چیپ‌های فیلتر با شمار
    const chips = $('matchChips');
    const today = Engine.todayISO();
    if (chips) {
      const defs = [
        ['all', 'همه', list.length],
        ['scheduled', 'ثبت‌نشده', list.filter(x => x.m.status !== 'done').length],
        ['done', 'تمام‌شده', list.filter(x => x.m.status === 'done').length],
        ['today', 'امروز', list.filter(x => x.m.date === today).length]
      ];
      chips.innerHTML = defs.map(d =>
        '<button class="chip' + (f === d[0] ? ' active' : '') + '" onclick="UI.setMatchFilter(\'' + d[0] + '\')">' + d[1] + '<span class="n">' + Engine.faNum(d[2]) + '</span></button>'
      ).join('');
    }
    $('matchesList').innerHTML = list
      .filter(x => (f === 'all' || (f === 'today' ? x.m.date === today : x.m.status === f)) &&
        (!q2 || Engine.teamName(t, x.m.a).includes(q2) || Engine.teamName(t, x.m.b).includes(q2)))
      .map(x => {
        const h = x.roundTitle !== lastRt ? '<h3 class="block-title">' + esc(x.roundTitle) + '</h3>' : '';
        lastRt = x.roundTitle;
        return h + matchRow(t, x.m, x.roundTitle);
      }).join('') || '<p class="placeholder">بازی‌ای با این فیلتر نیست 🔍</p>';
  }
  function setMatchFilter(f) {
    const el = $('matchFilter');
    if (el) el.value = f;
    renderMatches();
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
    // خلاصه آماری
    const doneMs = Engine.allMatches(t).filter(x => !x.m.hidden && x.m.status === 'done' && x.m.result && x.m.result.type === 'score');
    const totalGoals = doneMs.reduce((n, x) => { const tt = Engine.totals(x.m); return n + (Number(tt.a) || 0) + (Number(tt.b) || 0); }, 0);
    const avgGoals = doneMs.length ? (totalGoals / doneMs.length).toFixed(1) : '۰';
    const topWin = rows.reduce((mx, r) => Math.max(mx, r.won || 0), 0);
    const summaryHtml = '<div class="stat-grid">' +
      statCard(doneMs.length, 'بازی', doneMs.length, '⚽') +
      statCard(totalGoals, 'گل', totalGoals, '🥅') +
      statCard(String(avgGoals).replace(/[0-9.]+/g, d => Engine.faNum(d)), 'میانگین گل', null, '📊') +
      statCard(topWin, 'بیشترین برد', topWin, '🏅') + '</div>';
    // سکوی سه نفره
    const podiumHtml = rank.length >= 3 ? '<h3 class="block-title">سکوی قهرمانان</h3><div class="podium">' +
      [rank[1], rank[0], rank[2]].map((r, i) => {
        const first = r === rank[0];
        const pos = rank.indexOf(r) + 1;
        const rtm = teamById(t, r.id);
        return '<div class="podium-item' + (first ? ' first' : '') + '"><div class="medal" aria-hidden="true">' + MEDALS[pos - 1] + '</div>' +
          '<div class="nm">' + esc(Engine.teamName(t, r.id)) + '</div><div class="sub">' + esc(r.title) + '</div></div>';
      }).join('') + '</div>' : '';
    const mvpHtml = mvpBoard.length ? '<h3 class="block-title">ستارگان میدان ⭐</h3>' +
      (mvpBoard[0].awards ? '<div class="champ"><div class="t">⭐ بهترین بازیکن تورنمنت</div><div class="n">' + esc(mvpBoard[0].name) + '</div><div class="t">' + Engine.faNum(mvpBoard[0].awards) + ' بار بهترین بازیکن' + (primaryLbl ? ' • ' + Engine.faNum(mvpBoard[0].main) + ' ' + primaryLbl : '') + '</div></div>' : '') +
      '<table class="stats"><tr><th>بازیکن</th><th>تیم</th><th>بهترین بازیکن</th>' + (primaryLbl ? '<th>' + primaryLbl + '</th>' : '') + '</tr>' +
      mvpBoard.map(p => '<tr><td>⭐ ' + esc(p.name) + '</td><td>' + esc(Engine.teamName(t, p.team)) + '</td><td>' + Engine.faNum(p.awards) + '</td>' + (primaryLbl ? '<td>' + Engine.faNum(p.main) + '</td>' : '') + '</tr>').join('') + '</table>' : '';
    box.innerHTML =
      '<div class="view-top"><h3 class="block-title m-0">نتایج و رتبه‌بندی</h3><button class="action small" onclick="Export.pngStats()">🖼️ عکس آمار</button></div>';
    const paintStats = () => {
      box.insertAdjacentHTML('beforeend',
        summaryHtml + podiumHtml +
        (champ
          ? '<div class="panel pad stats-champ"><div class="champion-emblem">🏆</div><div class="champ-label">🏆 قهرمان تورنمنت</div><div class="champ-name">' + esc(champ.name) + '</div></div>' + champPathHtml(t)
          : '<div class="panel pad stats-champ"><div class="champion-emblem">🏆</div><h3>قهرمان هنوز مشخص نشده</h3><p>' + Engine.faNum(Engine.allMatches(t).filter(x => x.m.status !== 'done' && !x.m.hidden).length) + ' بازی تا پایان باقی مانده است.</p></div>') +
        '<h3 class="block-title">رده‌بندی نهایی</h3>' + rank.map((r, i) => {
          const rtm = teamById(t, r.id);
          return '<div class="rank-row"><span class="pos">' + (i < 3 ? MEDALS[i] + ' ' : '') + Engine.faNum(i + 1) + '</span>' +
          avatar(rtm) +
          '<span class="nm">' + esc(Engine.teamName(t, r.id)) + '</span><span class="ti">' + esc(r.title) + '</span></div>'; }).join('') +
        '<h3 class="block-title">جدول عملکرد تیم‌ها</h3><table class="stats"><tr><th>تیم</th><th>بازی</th><th>برد</th><th>باخت</th><th>زده</th><th>خورده</th><th>تفاضل</th></tr>' +
        rows.map(r => '<tr><td>' + esc(r.tm.name) + '</td><td>' + Engine.faNum(r.played) + '</td><td>' + Engine.faNum(r.won) +
          '</td><td>' + Engine.faNum(r.lost) + '</td><td>' + Engine.faNum(r.gf) + '</td><td>' + Engine.faNum(r.ga) +
          '</td><td>' + Engine.faNum(r.gf - r.ga) + '</td></tr>').join('') + '</table>' +
        '<h3 class="block-title">بازی جوانمردانه</h3><table class="stats"><tr><th>تیم</th><th>🟨</th><th>🟥</th><th>امتیاز منفی</th></tr>' +
        fair.map(r => '<tr><td>' + esc(r.tm.name) + '</td><td>' + Engine.faNum(r.y) + '</td><td>' + Engine.faNum(r.r) +
          '</td><td>' + Engine.faNum(r.fair) + '</td></tr>').join('') + '</table>' + mvpHtml + scorersHtml(t));
    };
    if (t.teams.length > 12 && !reducedMotion()) {
      box.insertAdjacentHTML('beforeend', skelBars(6));
      requestAnimationFrame(() => requestAnimationFrame(() => {
        box.querySelectorAll('.skel').forEach(s => s.remove());
        paintStats();
      }));
    } else paintStats();
  }
  function champPathHtml(t) {
    const path = Engine.championPath(t);
    if (!path.length) return '';
    return '<div class="timeline">' +
      path.map((p, i) =>
        '<div class="tl-row"><span class="tl-dot">' + (i === path.length - 1 ? '🏆' : '✅') + '</span>' +
        '<div class="tl-body"><div class="tl-title">' + esc(p.roundTitle) + '</div>' +
        '<div class="tl-sub">برد ' + esc(Export.scoreText(t, p.m)) + ' مقابل ' + esc(Engine.teamName(t, p.opp)) + '</div></div></div>'
      ).join('') + '</div>';
  }

  function scorersHtml(t) {
    const tab = Engine.scorersTable(t);
    if (!tab.length) {
      if (t.sport !== 'football' && t.sport !== 'futsal' && t.settings.scoring !== 'goals') return '';
      return '<h3 class="block-title">⚽ گلزنان و پاسورها</h3><p class="panel pad note-panel">هنوز گلی ثبت نشده. از کارت هر بازی، گلزن‌ها را اضافه کن.</p>';
    }
    const top = tab[0];
    return '<h3 class="block-title">⚽ گلزنان برتر</h3>' +
      '<div class="champ"><div class="t">👟 آقای گل</div><div class="n">' + esc(top.name) + '</div>' +
      '<div class="t">' + esc(Engine.teamName(t, top.team)) + ' • ' + Engine.faNum(top.goals) + ' گل' + (top.assists ? ' • ' + Engine.faNum(top.assists) + ' پاس گل' : '') + '</div></div>' +
      '<table class="stats"><tr><th>#</th><th>بازیکن</th><th>تیم</th><th>⚽ گل</th><th>🅰️ پاس</th><th>بازی</th></tr>' +
      tab.map((p, i) => '<tr><td>' + (i < 3 ? MEDALS[i] + ' ' : '') + Engine.faNum(i + 1) + '</td><td>' + esc(p.name) + '</td><td>' + esc(Engine.teamName(t, p.team)) +
        '</td><td><strong>' + Engine.faNum(p.goals) + '</strong></td><td>' + Engine.faNum(p.assists) + '</td><td>' + Engine.faNum(p.played) + '</td></tr>').join('') + '</table>';
  }

  /* ---------- آموزش فصل دوم (کاملاً منطبق بر کتاب) ---------- */
  function renderLearn() {
    const box = $('learnContent');
    if (!box) return;
    const t = Store.active();
    const n = t ? t.teams.length : 8;
    const c = Engine.calcInfo(Math.max(2, n));
    box.innerHTML =
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۱ • جدول تک‌حذفی چیست؟</h3>' +
      '<p>با یک باخت حذف می‌شوی؛ فرصت جبران نیست. هر بازی مثل فینال هیجان دارد. سریع‌ترین جدول است؛ وقتی شرکت‌کننده زیاد و زمان/امکانات کم است بهترین انتخاب است. عیب: بدشانسی قرعه و حذف زودهنگام قوی‌ها؛ راه‌حل: سیدگذاری + رپشاژ.</p></div>' +
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۲ • سه روش چیدمان کتاب</h3>' +
      '<p>الف) <strong>قرعه‌کشی</strong>: بدون توجه به رتبه، بالا→پایین روی جدول خام. فقط وقتی تفاوت سطح مشخص نیست (کشتی/رزمی).<br>' +
      'ب) <strong>سیدگذاری</strong>: S1 قوی‌ترین. S1 بالا، S2 پایین تا فینال زودرس نشود. سپس S4 پایین نیمه بالا و S3 بالای نیمه پایین.<br>' +
      'ج) <strong>ترکیبی</strong>: چند سید اول مشخص + بقیه قرعه. همین برنامه با گزینه «ج) ترکیبی» دقیقاً همین را می‌سازد.</p>' +
      '<div class="modal-btns"><button class="action primary" onclick="UI.openDrawDialog()">🎲 امتحان هر سه روش</button></div></div>' +
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۳ • قاعده جمع جفت‌سید (حفظ کن!)</h3>' +
      '<table class="stats"><tr><th>جدول</th><th>جمع هر جفت</th><th>مثال دور اول</th></tr>' +
      '<tr><td>۴تایی</td><td>۵</td><td>۱−۴ • ۳−۲</td></tr>' +
      '<tr><td>۸تایی</td><td>۹</td><td>۱−۸ • ۵−۴ • ۳−۶ • ۷−۲</td></tr>' +
      '<tr><td>۱۶تایی</td><td>۱۷</td><td>۱−۱۶ • ۹−۸ • ۵−۱۲ • ۱۳−۴ • ۳−۱۴ • ۱۱−۶ • ۷−۱۰ • ۱۵−۲</td></tr>' +
      '<tr><td>۳۲تایی</td><td>۳۳</td><td>۱−۳۲ • ۱۶−۱۷ • ۹−۲۴ • …</td></tr>' +
      '<tr><td>۶۴تایی</td><td>۶۵</td><td>۱−۶۴ • ۳۲−۳۳ • …</td></tr></table>' +
      '<p class="note">ترتیب کامل برنامه دقیقاً همین است. می‌توانی در «جدول» با نمای «کل مسیر» راستی‌آزمایی کنی.</p></div>' +
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۴ • محاسبات (با عدد تورنمنت فعلی: ' + Engine.faNum(n) + ' نفر)</h3>' +
      '<p>مبنا: ' + Engine.faNum(c.base) + ' (۲ به توان ' + Engine.faNum(c.rounds) + ') • تعداد دور: ' + Engine.faNum(c.rounds) +
      ' • کل مسابقات: ' + Engine.faNum(c.total) + ' (n−۱) • استراحت: ' + Engine.faNum(c.base) + '−' + Engine.faNum(c.n) + '=' + Engine.faNum(c.byes) +
      ' • مسابقات دور اول: ' + Engine.faNum(c.n) + '−' + Engine.faNum(c.lower) + '=' + Engine.faNum(c.firstMatches) + ' (روش توان کمتر)</p>' +
      '<p class="note">مثال کتاب: ۲۵ نفر → مبنا ۳۲ (۲⁵) • استراحت ۷=۲۵−۳۲ • دور اول ۹=۱۶−۲۵ • کل ۲۴=۱−۲۵.</p></div>' +
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۵ • استراحت B: دو روش</h3>' +
      '<p><strong>توان بالاتر (با B):</strong> استراحت = مبنای بالاتر − n (مثل ۳=۵−۸) به سیدهای ۱،۲،۳… . روی شاخه خالی B بنویس.<br>' +
      '<strong>توان کمتر/پیشرفته (بدون B):</strong> مسابقات دور اول = n − توان کمتر (مثل ۲=۴−۶)؛ خطوط اضافی به برگه اصلی منتقل نمی‌شود. تعداد استراحت/مسابقه در هر دو روش یکی است؛ فقط نمایش فرق می‌کند. وقتی استراحت زیاد است روش توان کمتر تمیزتر است.</p>' +
      '<div class="modal-btns"><button class="action" onclick="UI.switchView(\'bracket\')">دیدن B در جدول</button></div></div>' +
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۶ • نکته‌های ظریف کتاب (رعایت‌شده در برنامه)</h3>' +
      '<p>• در نیمه بالا شاخه‌های بالاتر و در نیمه پایین شاخه‌های پایین‌تر اول پر می‌شوند (قرینه).<br>' +
      '• هم‌باشگاهی/هم‌شهری تا حد ممکن دور اول به هم نخورند؛ جای جفت‌سیدهای نزدیک (۵↔۶ یا ۹↔۱۰) عوض شود.<br>' +
      '• برد/باخت مثال‌های کتاب فرضی است؛ سرنوشت هر بازی می‌تواند عوض شود.<br>' +
      '• ۳۳ تا ۶۴ نفر: مبنای ۶۴، رسم دو نیمه پشت‌به‌هم در یک برگه؛ اگر استراحت زیاد بود روش توان کمتر.</p></div>' +
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۷ • جدول شانس مجدد / رپشاژ 🥉</h3>' +
      '<p>مخصوص کشتی/رزمی (چیدمان همیشه قرعه). بعد از فینال: بازندگان به قهرمان یک دسته + بازندگان به نایب‌قهرمان یک دسته، هر دسته تک‌حذفی؛ دو نفر برتر «سوم مشترک». در تنیس‌روی‌میز/بدمینتون مرسوم نیست مگر انتخاب تیم برای مرحله بعد مهم باشد؛ اولویت آن‌ها سیدگذاری است.</p>' +
      '<div class="modal-btns"><button class="action primary" onclick="UI.switchView(\'bracket\')">ساخت رپشاژ بعد از فینال</button></div></div>' +
      '<div class="panel pad lesson info">' +
      '<h3 class="mini-title accent">۸ • جدول دو حذفی (فصل چهارم) ⚔️</h3>' +
      '<p><strong>تعریف:</strong> هر شرکت‌کننده فقط با <strong>دو باخت</strong> حذف می‌شود. یک باخت یعنی انتقال به «جدول بازنده‌ها»؛ باخت دوم یعنی حذف. سیدگذاری و استراحت‌گذاری و ادامهٔ مسابقات بین برندگان <strong>دقیقاً مثل جدول تک‌حذفی</strong> است.</p>' +
      '<p><strong>ساختار:</strong> جدول برنده‌ها (WB) + جدول بازنده‌ها (LB) + فینال بزرگ. برندهٔ جدول بازنده‌ها به فینال بزرگ می‌رسد و دوباره با برندهٔ جدول برنده‌ها بازی می‌کند؛ اگر ببرد قهرمان می‌شود.</p>' +
      '<p><strong>قاعدهٔ انتقال بازنده‌ها:</strong> بازندگان <strong>دور اول</strong> و <strong>دور آخر</strong> مستقیم به جدول بازنده‌ها می‌روند؛ بازندگان دور دوم به بعد (بجز دور آخر) <strong>ضربدری</strong> منتقل می‌شوند. اولین ضربدری را «ضربدری کوچک» (دور دوم) و آخرین را «ضربدری بزرگ» می‌گویند. دو روش رسم: <strong>عمودی</strong> (بازنده‌ها پایین جدول) و <strong>افقی</strong> (بازنده‌ها سمت چپ/پشت جدول؛ از وسط برگه شروع کن تا دو طرف جا داشته باشد).</p>' +
      '<p><strong>استراحت B:</strong> مثل تک‌حذفی؛ در روش توان بالاتر خطوط B حذف و به «برگهٔ پاک‌نویس» منتقل می‌شود. بهتر است اول پیش‌نویس رسم شود.</p>' +
      '<p><strong>محاسبات:</strong> کل مسابقات ≈ <strong>۲n−۲</strong> (اگر قهرمان از جدول بازنده‌ها بیاید ۲n−۱). برای ' + Engine.faNum(Math.max(2, n)) + ' نفر: ' +
      (function () { const d = Engine.deCalcInfo(Math.max(2, n)); return Engine.faNum(d.wbMatches) + ' بازی در جدول برنده‌ها + ' + Engine.faNum(d.lbMatches) + ' در جدول بازنده‌ها + ۱ فینال = ' + Engine.faNum(d.total); })() + '.</p>' +
      '<p class="note">حداکثر ۶۴ نفر (طبق کتاب). چون تعداد مسابقات زیاد است، از جدول تک‌حذفی کامل‌تر ولی از دوره‌ای سبک‌تر است و جزو جداول پرمصرف نیست؛ با افزایش نفرات از جداول ترکیبی استفاده کن.</p>' +
      '<div class="modal-btns"><button class="action primary" onclick="UI.openTournamentDialog(true)">ویرایش تورنمنت و انتخاب نوع جدول</button></div></div>' +
      /* ---------- فصل سوم کتاب: جدول آسیایی ---------- */
      '<div class="panel pad lesson info">' +
      '<h3 class="mini-title accent">۹ • جدول آسیایی چیست؟ (فصل سوم) 🌏</h3>' +
      '<p><strong>تعریف:</strong> در جدول یک‌حذفی هر شرکت‌کننده با <strong>اولین باخت</strong> از دور مسابقات حذف می‌گردد و فقط مقام‌های اول و دوم تعیین می‌شوند. در جدول آسیایی، پایه و اساس چیدمان و استراحت‌گذاری شرکت‌کنندگان <strong>دقیقاً همانند جدول یک‌حذفی</strong> است، اما تیم‌ها با باخت از دور مسابقات خارج نمی‌شوند؛ مسابقات تا تعیین مقام کلیهٔ شرکت‌کنندگان ادامه پیدا می‌کند.</p>' +
      '<p>در جدول آسیایی هر شرکت‌کننده با هر باخت، شانس کسب مقام‌های بالاتر را از دست می‌دهد و فقط برای کسب مقام در بین بازندگان تلاش می‌کند. درواقع جدول آسیایی تنها جدولی است که در آن با <strong>کمترین تعداد مسابقه، مقام همهٔ شرکت‌کنندگان</strong> مشخص می‌گردد.</p>' +
      '<p class="note">کاربرد عملی: کشتی، رزمی و رشته‌های انفرادی که لازم است <em>همهٔ</em> شرکت‌کنندگان رتبه داشته باشند. ترکیب تک‌حذفی + پشت‌جدول.</p>' +
      '<div class="modal-btns"><button class="action primary" onclick="UI.openTournamentDialog(true)">ساخت جدول آسیایی</button></div></div>' +
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۱۰ • نحوهٔ رسم جدول آسیایی</h3>' +
      '<p><strong>۱)</strong> در جدول آسیایی برای <strong>دور اول</strong> مسابقات دقیقاً همانند جدول یک‌حذفی عمل می‌شود. سپس بازنده‌های دور اول به <strong>پشت جدول (سمت چپ)</strong> منتقل می‌شوند. بدیهی است که نصف آنها یعنی <strong>برندگان دور اول</strong> به سمت راست و نصف بقیه که بازندگان هستند به سمت چپ یا پشت جدول منتقل می‌شوند. برندگان دور اول برای <strong>نصف مقام‌ها</strong> و بازندگان (پشت جدول) نیز برای <strong>نصف دیگر مقام‌ها</strong> با هم رقابت می‌کنند.</p>' +
      '<p><strong>۲)</strong> در جدول آسیایی هر بازنده در هر دوری که بازنده شود، شانس دستیابی به مقام‌های بالاتر را از دست می‌دهد و فقط برای <strong>کسب بهترین مقام در همان دوری که باخته است</strong> رقابت خواهد کرد.</p>' +
      '<p class="note">یعنی: بازندهٔ فینال → نایب‌قهرمان (رتبه ۲) • بازندگان نیمه‌نهایی → مقام ۳ و ۴ • بازندگان یک‌چهارم → مقام ۵ تا ۸ • بازندگان دور اول → پشت جدول (مقام ۹ به بعد).</p></div>' +
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۱۱ • مثال‌های کتاب (فصل سوم)</h3>' +
      '<p><strong>جدول آسیایی ۴ شرکت‌کننده:</strong> دور اول ۲ بازی → فینال (مقام ۱ و ۲) + بازی بازندگان دور اول (مقام ۳ و ۴).</p>' +
      '<p><strong>جدول آسیایی ۸ نفره:</strong> «در جدول آسیایی ۸تایی، برنده‌های دور اول برای مقام‌های <strong>اول تا چهارم</strong> و بازنده‌های دور اول در پشت جدول برای مقام‌های باقیمانده یعنی <strong>پنجم تا هشتم</strong> رقابت می‌کنند.» یعنی ۴ برندهٔ دور اول → نیمه‌نهایی و فینال (مقام ۱ و ۲) + بازی مقام ۳ و ۴؛ و ۴ بازندهٔ دور اول → پشت جدول (مقام ۵ تا ۸).</p>' +
      '<p><strong>جدول آسیایی ۱۱ شرکت‌کننده:</strong> «در جدول آسیایی با ۱۱ شرکت‌کننده، ۸ برندهٔ دور اول برای مقام‌های اول تا هشتم (سمت راست) و ۸ بازندهٔ دور اول برای مقام‌های نهم تا شانزدهم (پشت جدول) مسابقه می‌دهند.» (بدیهی است که تعیین برنده و بازنده در این مثال‌ها فرضی هستند.)</p>' +
      '<p class="note">قاعدهٔ کلی: تعداد برندگان دور اول = نصفِ مبنا؛ آن‌ها برای نیمهٔ بالای مقام‌ها و بازندگان دور اول برای نیمهٔ پایین مقام‌ها رقابت می‌کنند.</p></div>' +
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۱۲ • سیدگذاری و استراحت در جدول آسیایی</h3>' +
      '<p>«همان‌طور که مشاهده می‌شود برای سیدگذاری دقیقاً همانند جدول یک‌حذفی عمل شده است. لذا اگر تعداد شرکت‌کنندگان نتوانند از عدد ۲ باشند، استراحت‌گذاری همانند یک‌حذفی انجام می‌گیرد و <strong>حروف (B) به عنوان بازنده تلقی می‌گردد</strong>.»</p>' +
      '<p>یعنی در جدول آسیایی هم دقیقاً مثل تک‌حذفی سیدگذاری می‌شود (S1 قوی‌ترین، جمع جفت‌سید ۵/۹/۱۷/…) و تیم‌های استراحت‌کرده به سیدهای بالا می‌روند؛ فقط Bها به پشت جدول می‌افتند و عملاً مقام‌های آخر را می‌گیرند.</p>' +
      '<p><strong>محاسبات:</strong> مبنا مثل تک‌حذفی (۲ به توان k) • دور اول = مبنا÷۲ بازی • جدول جلو = مبنا÷۲ تیم (مقام ۱ تا مبنا÷۲) • پشت جدول = مبنا÷۲ تیم (مقام مبنا÷۲+۱ تا مبنا). برای ' + Engine.faNum(Math.max(2, n)) + ' نفر: ' +
      (function () { const a = Engine.asianCalcInfo(Math.max(2, n)); return 'مبنا ' + Engine.faNum(a.base) + ' • دور اول ' + Engine.faNum(a.firstMatches) + ' بازی • جدول جلو ' + Engine.faNum(a.front) + ' تیم • پشت جدول ' + Engine.faNum(a.back) + ' تیم • کل بازی‌ها ' + Engine.faNum(a.total); })() + '.</p>' +
      '<div class="modal-btns"><button class="action" onclick="UI.switchView(\'bracket\')">دیدن جدول آسیایی</button></div></div>' +
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۱۳ • نکته‌های کتاب (فصل سوم)</h3>' +
      '<p>• معمولاً از جدول آسیایی برای <strong>حداکثر ۱۱ شرکت‌کننده</strong> استفاده می‌کنند. اگر تعداد شرکت‌کنندگان زیاد باشد بهتر است از جداول دیگری استفاده گردد.<br>' +
      '• ممکن است به تشخیص کمیتهٔ فنی نیازی به تعیین مقام و رتبه برای همهٔ شرکت‌کنندگان نباشد. لذا معمولاً جدول آسیایی را با توجه به اهداف و زمان، <strong>تا هر مقامی که بخواهیم</strong> ادامه می‌دهیم.<br>' +
      '• تمرین کتاب: جدول آسیایی برای ۹ شرکت‌کننده (به روش توان بالاتر) را کامل کنید و مقام‌های فرضی را مشخص کنید؛ همچنین جدول‌های ۱۲ تا ۱۶ شرکت‌کننده را روی «جدول خام ۱۶تایی» تمرین کنید.</p>' +
      '<div class="modal-btns"><button class="action primary" onclick="UI.openTournamentDialog(true)">ساخت جدول آسیایی با برنامه</button></div></div>' +
      /* ---------- فصل پنجم کتاب: جدول دوره‌ای ---------- */
      '<div class="panel pad lesson info">' +
      '<h3 class="mini-title accent">۱۴ • جدول دوره‌ای چیست؟ (فصل پنجم) 🔄</h3>' +
      '<p><strong>تعریف:</strong> جدول دوره‌ای جدولی است که <strong>همهٔ شرکت‌کنندگان در یک گروه با همدیگر بازی می‌کنند</strong>. در جداول حذفی (یک‌حذفی، دو‌حذفی، آسیایی) ضروری بود که نتیجهٔ برد و باخت هر بازی با برد یکی و باخت دیگری مشخص گردد، اما در جدول دوره‌ای <strong>ممکن است نتیجهٔ بازی به تساوی کشیده شود</strong>. لذا برای جدول دوره‌ای در هر رشتهٔ ورزشی برای برد، باخت و تساوی امتیازات خاصی در نظر گرفته شده و با توجه به جمع امتیازات کسب‌شده، مقام هر شرکت‌کننده در گروه مشخص می‌گردد.</p>' +
      '<p>می‌دانیم زمان، امکانات و تجهیزات و حتی شرایط مسابقه در هر رشته متفاوت است؛ بنابراین کمیتهٔ فنی در هر رشته تصمیم می‌گیرد که کل شرکت‌کنندگان در <strong>یک یا چند گروه</strong> تقسیم شوند.</p>' +
      '<p><strong>محاسبات:</strong> هر تیم در گروه خودش <strong>(n−۱) مسابقه</strong> می‌دهد و تعداد کل مسابقات گروه از فرمول <strong>n(n−۱)÷۲</strong> به دست می‌آید؛ یعنی برای ۵ شرکت‌کننده باید ۱۰ مسابقه انجام گیرد.</p>' +
      '<p class="note">سؤال کتاب: اگر ۸ شرکت‌کننده در مسابقه انفرادی تنیس روی میز در یک گروه با هم مسابقه بدهند، هر تیم ۷ مسابقه و کل ۲۸ مسابقه خواهد داشت؛ اما اگر به‌جای آن ۸ تیم هندبال در یک گروه بازی کنند، به چه مشکلاتی می‌خوریم؟ (زمان و امکانات!)</p></div>' +
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۱۵ • نکتهٔ گروه‌بندی</h3>' +
      '<p>چنانچه تعداد تیم‌ها یا نفرات شرکت‌کننده زیاد باشند، برای اینکه تعداد مسابقات خیلی زیاد نشود، بهتر است شرکت‌کنندگان در <strong>بیش از یک گروه</strong> تقسیم‌بندی شوند؛ در این حالت از <strong>جداول ترکیبی</strong> برای مشخص کردن نتایج نهایی استفاده می‌گردد (فصل بعد).</p></div>' +
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۱۶ • رسم جدول دور بازی‌ها</h3>' +
      '<p><strong>۱)</strong> تیم‌ها را بر اساس <strong>سیدگذاری یا قرعه‌کشی</strong> به ترتیب در یک <strong>ستون</strong> می‌نویسیم.</p>' +
      '<p><strong>۲)</strong> برای رسم دور اول، شرکت‌کنندگان را به شکل <strong>مقابل همدیگر</strong> قرار می‌دهیم؛ یعنی نصف آنها در سمت چپ و نصف بعدی روبه‌روی آنها (جفت‌های قرینه).</p>' +
      '<p><strong>۳)</strong> برای رسم دور دوم، <strong>«۱» ثابت</strong> می‌ماند و بقیه <strong>یک دنده مخالف عقربه‌های ساعت</strong> جابه‌جا می‌شوند؛ برای دورهای بعدی نیز به همین‌طور عمل می‌شود.</p>' +
      '<p class="note">مثال کتاب (۶ شرکت‌کننده): دور۱ = ۱−۶، ۲−۵، ۳−۴ • دور۲ = ۱−۵، ۴−۶، ۲−۳ • دور۳ = ۱−۴، ۳−۵، ۲−۶ • دور۴ = ۱−۳، ۲−۴، ۵−۶ • دور۵ = ۱−۲، ۳−۶، ۴−۵ — یعنی ۵ دور برای ۶ شرکت‌کننده (n−۱).</p>' +
      '<p class="note">برنامه دقیقاً همین روش کتابی را پیاده کرده است: در «جدول» برای هر دور، جفت‌ها را می‌بینید.</p></div>' +
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۱۷ • حالت فرد: استراحت (B)</h3>' +
      '<p>اگر تعداد شرکت‌کنندگان <strong>زوج</strong> باشد، دو به دو با هم بازی می‌کنند و نیازی به استراحت‌گذاری نیست. اما اگر <strong>فرد</strong> باشد، باید در هر دور یکی از شرکت‌کنندگان استراحت نماید.</p>' +
      '<p>روش کتاب: ابتدا شرکت‌کنندگان را برحسب سیدگذاری یا قرعه‌کشی در یک ستون زیر هم می‌نویسیم و <strong>در انتها حرف B را به ستون اضافه می‌کنیم</strong>؛ سپس همانند توضیحات قبلی دورهای مسابقات رسم می‌گردد. در این حالت نیز همواره «۱» ثابت و سایر شرکت‌کنندگان هر دور یک دنده جابه‌جا می‌شوند.</p>' +
      '<p>چون تیمی که B دارد عملاً بازی انجام نمی‌دهد، لذا <strong>تعداد دورها در حالت فرد برابر با n</strong> (تعداد شرکت‌کنندگان) است؛ در حالی که در حالت زوج n−۱ دور داریم. تعداد کل مسابقات در هر دو حالت یکسان است.</p>' +
      '<p class="note">مثال کتاب (۳ شرکت‌کننده): دور۱ = ۱−B و ۲−۳ • دور۲ = ۱−۳ و B−۲ • دور۳ = ۱−۲ و ۳−B</p></div>' +
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۱۸ • جدول ثبت نتایج گروه</h3>' +
      '<p>در جداول حذفی نتیجه با برد یا باخت رقم می‌خورد و معمولاً در جدول ثبت نمی‌شود؛ اما در جدول دوره‌ای چون <strong>مجموع امتیازات و گاهی تفاضل نتایج</strong> مقام هر شرکت‌کننده را مشخص می‌کند، باید برای هر گروه جدولی به نام <strong>«جدول ثبت نتایج»</strong> طراحی شود.</p>' +
      '<p><strong>مراحل طراحی (کتاب):</strong></p>' +
      '<p>۱) به تعداد حداکثر ردیف و حداقل ستون جدول را رسم می‌کنیم.<br>' +
      '۲) خانه‌های قطری جدول را از سمت راست به چپ هاشور یا رنگ می‌زنیم (نیازی به این خانه‌ها نداریم).<br>' +
      '۳) در اولین خانهٔ هر ردیف نام شرکت‌کنندگان را می‌نویسیم.<br>' +
      '۴) در اولین خانهٔ هر ستون، نام شرکت‌کنندگان را به همان ترتیبِ ردیف‌ها می‌نویسیم.<br>' +
      '۵) نتیجهٔ مسابقهٔ هر جفت شرکت‌کننده را در خانه‌های متقاطع آن دو تیم ثبت می‌کنیم؛ یعنی با هر مسابقه <strong>دو خانه</strong> تکمیل می‌گردد.<br>' +
      '۶) نتایج مسابقات برای هر رشته متفاوت است: برای فوتبال، بسکتبال و هندبال تعداد گل زده و گل خورده و برای والیبال، بدمینتون و تنیس روی میز تعداد ست‌ها با امتیاز هر تیم ثبت می‌شوند. همچنین امتیاز برد یا باخت یا تساوی (در هر رشته منحصر به فرد و متفاوت) در مخرج نوشته می‌شود.</p>' +
      '<p class="note">برنامه این جدول را خودکار می‌سازد: تب «📊 جدول ثبت نتایج گروه» با ستون‌های بازی/برد/باخت/مساوی/زده/خورده/تفاضل/امتیاز/رتبه — و امتیاز برد، مساوی و باخت در «تنظیمات» قابل تغییر است.</p>' +
      '<div class="modal-btns"><button class="action" onclick="UI.switchView(\'bracket\')">دیدن جدول نتایج</button></div></div>' +
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۱۹ • نکتهٔ مهم: مسابقات رفت و برگشت</h3>' +
      '<p>در مسابقات لیگ که به‌صورت <strong>رفت و برگشت (دو دوره‌ای)</strong> برگزار می‌شوند، نتایج دور رفت در خانه‌های <strong>بالای هاشور</strong> و نتایج برگشت در خانه‌های <strong>زیر هاشور</strong> ثبت می‌شوند.</p></div>' +
      '<div class="panel pad lesson">' +
      '<h3 class="mini-title accent">۲۰ • تمرین‌های فصل پنجم</h3>' +
      '<p>• تمرین کتاب: اگر ۴ تیم فوتبال به‌صورت دوره‌ای در یک گروه با هم مسابقه دهند، جدول دور مسابقات را کامل کنید.<br>' +
      '• تمرین کتاب: ۵ شرکت‌کنندهٔ بدمینتون → محاسبهٔ تعداد دورها و تعداد کل مسابقات، تکمیل جدول دورها و جدول ثبت نتایج.<br>' +
      '• تمرین کتاب: ۷ تیم والیبال → سیدگذاری تیم‌ها، محاسبهٔ تعداد دورها (۷) و کل مسابقات (۲۱)، رسم جدول دورهای مسابقات و تکمیل جدول ثبت نتایج.<br>' +
      '• مقایسه کنید: معایب و محاسن جدول یک‌حذفی و دوره‌ای چیست؟ آیا حساسیت قرعه‌کشی در جدول دوره‌ای مثل جدول یک‌حذفی است؟</p>' +
      '<div class="modal-btns"><button class="action primary" onclick="UI.openTournamentDialog(true)">ساخت جدول دوره‌ای با برنامه</button></div></div>';
    // تبدیل فصل‌ها به آکاردئون + فهرست
    const lessons = Array.from(box.querySelectorAll('.lesson'));
    const accs = lessons.map((p, i) => {
      const h = p.querySelector('h3');
      const raw = h ? h.textContent : ('فصل ' + Engine.faNum(i + 1));
      const title = raw.replace(/^[۰-۹0-9]+\s*[•\-–—]\s*/, '').trim();
      if (h) h.remove();
      const info = p.classList.contains('info');
      p.className = 'lesson' + (info ? ' info' : '');
      const acc = document.createElement('div');
      acc.className = 'acc' + (i === 0 ? ' open' : '');
      acc.id = 'acc' + (i + 1);
      acc.innerHTML = '<button class="acc-head" aria-expanded="' + (i === 0) + '" onclick="UI.toggleAcc(this)">' +
        '<span class="n">' + Engine.faNum(i + 1) + '</span><span class="at">' + esc(title) + '</span><span class="chev" aria-hidden="true">◀</span></button>' +
        '<div class="acc-body"></div>';
      acc.querySelector('.acc-body').appendChild(p);
      return { acc, title };
    });
    box.innerHTML = '';
    accs.forEach(a => box.appendChild(a.acc));
    const toc = $('learnToc');
    if (toc) {
      toc.innerHTML = accs.map((a, i) => '<a href="#acc' + (i + 1) + '" onclick="UI.jumpAcc(' + (i + 1) + ')">فصل ' + Engine.faNum(i + 1) + ' • ' + esc(a.title) + '</a>').join('');
    }
  }
  function toggleAcc(head) {
    const acc = head.closest('.acc');
    if (!acc) return;
    const open = acc.classList.toggle('open');
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    buzz(8);
  }
  function jumpAcc(n) {
    const el = $('acc' + n);
    if (!el) return;
    if (!el.classList.contains('open')) {
      const h = el.querySelector('.acc-head');
      if (h) h.click();
    }
    setTimeout(() => el.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' }), 60);
  }

  /* ---------- تنظیمات ---------- */
  function renderSettings() {
    const t = Store.active();
    if (!t) return;
    $('setThird').checked = !!t.settings.thirdPlace && !Engine.isDouble(t) && !Engine.isAsian(t);
    $('setThird').disabled = Engine.isDouble(t) || Engine.isAsian(t);
    $('setScoring').value = t.settings.scoring || 'goals';
    $('setSeries').value = String(t.settings.series || 1);
    $('setBye').value = t.settings.byeTo || 'top';
    if ($('setByeDisplay')) $('setByeDisplay').value = t.settings.byeDisplay || 'higher';
    const P = (t.settings && t.settings.points) || { win: 3, draw: 1, loss: 0 };
    if ($('setPtWin')) $('setPtWin').value = P.win || 0;
    if ($('setPtDraw')) $('setPtDraw').value = P.draw || 0;
    if ($('setPtLoss')) $('setPtLoss').value = P.loss || 0;
    const ptsBox = $('pointsBox');
    if (ptsBox) ptsBox.classList.toggle('hidden', !Engine.isRoundRobin(t));
    syncThemeUI();
    const cb = $('calcBox');
    if (cb) {
      if (Engine.isDouble(t)) {
        const d = Engine.deCalcInfo(Math.max(2, t.teams.length));
        cb.innerHTML = '<strong>📐 محاسبات جدول دو حذفی (' + Engine.faNum(t.teams.length) + ' شرکت‌کننده)</strong><br>' +
          'مبنا: ' + Engine.faNum(d.base) + ' • استراحت: ' + Engine.faNum(d.byes) +
          ' • برنده‌ها: ' + Engine.faNum(d.wbMatches) + ' • بازنده‌ها: ' + Engine.faNum(d.lbMatches) + ' • فینال: ۱' +
          ' • کل: ' + Engine.faNum(d.total) + ' (۲n−۲)' +
          '<br><span class="muted">حذف با دو باخت • روش چیدمان: ' + esc(drawMethodFa(t)) + '</span>';
      } else if (Engine.isAsian(t)) {
        const a = Engine.asianCalcInfo(Math.max(2, t.teams.length));
        cb.innerHTML = '<strong>📐 محاسبات جدول آسیایی (' + Engine.faNum(t.teams.length) + ' شرکت‌کننده)</strong><br>' +
          'مبنا: ' + Engine.faNum(a.base) + ' (۲ به توان ' + Engine.faNum(a.rounds) + ') • استراحت: ' + Engine.faNum(a.byes) +
          ' • دور اول: ' + Engine.faNum(a.firstMatches) + ' مسابقه • جدول جلو: ' + Engine.faNum(a.front) + ' تیم' +
          ' • پشت جدول: ' + Engine.faNum(a.back) + ' تیم • کل بازی‌ها: ' + Engine.faNum(a.total) +
          '<br><span class="muted">رتبه‌بندی کامل • روش چیدمان: ' + esc(drawMethodFa(t)) + '</span>';
      } else if (Engine.isRoundRobin(t)) {
        const r = Engine.roundCalcInfo(Math.max(2, t.teams.length));
        const P = (t.settings && t.settings.points) || { win: 3, draw: 1, loss: 0 };
        cb.innerHTML = '<strong>📐 محاسبات جدول دوره‌ای (' + Engine.faNum(t.teams.length) + ' شرکت‌کننده)</strong><br>' +
          'تعداد دور: ' + Engine.faNum(r.rounds) + (r.odd ? ' (فرد)' : ' (زوج)') +
          ' • مسابقه در هر دور: ' + Engine.faNum(r.perRound) +
          ' • مسابقات هر تیم: ' + Engine.faNum(r.perTeam) +
          ' • کل مسابقات: ' + Engine.faNum(r.total) +
          '<br><span class="muted">امتیاز: برد ' + Engine.faNum(P.win || 0) + ' • مساوی ' + Engine.faNum(P.draw || 0) + ' • باخت ' + Engine.faNum(P.loss || 0) + ' • روش چیدمان: ' + esc(drawMethodFa(t)) + '</span>';
      } else {
        const c = Engine.calcInfo(Math.max(2, t.teams.length));
        cb.innerHTML = '<strong>📐 محاسبات کتابی (' + Engine.faNum(t.teams.length) + ' شرکت‌کننده)</strong><br>' +
          'مبنا: ' + Engine.faNum(c.base) + ' (۲ به توان ' + Engine.faNum(c.rounds) + ') • دور: ' + Engine.faNum(c.rounds) +
          ' • کل: ' + Engine.faNum(c.total) + ' (n−۱) • استراحت: ' + Engine.faNum(c.byes) +
          ' • دور اول: ' + Engine.faNum(c.firstMatches) + ' مسابقه • جمع جفت‌سید: ' + Engine.faNum(c.sum) +
          '<br><span class="muted">روش چیدمان: ' + esc(drawMethodFa(t)) + '</span>';
      }
    }
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
    if ($('setByeDisplay')) t.settings.byeDisplay = $('setByeDisplay').value;
    if ($('setPtWin')) {
      const pts = {
        win: parseInt($('setPtWin').value, 10) || 0,
        draw: parseInt($('setPtDraw').value, 10) || 0,
        loss: parseInt($('setPtLoss').value, 10) || 0
      };
      t.settings.points = pts;
    }
    Store.save(); renderHeader(); renderSettings();
  }
  function saveAppSettings() {
    const cb = $('setTheme');
    if (cb) { Store.db.theme = cb.checked ? 'dark' : 'light'; Store.save(); applyTheme(); }
    else setTheme(Store.db.theme || 'dark');
  }
  function applyTheme() {
    const th = Store.db.theme || 'dark';
    document.documentElement.dataset.theme = th;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', th === 'light' ? '#f2f5f9' : '#0e1116');
    syncThemeUI();
  }
  function resetBracket() {
    const t = Store.active(); if (!t || !t.rounds.length) return;
    if (!confirm('کل جدول و نتایج پاک شود؟')) return;
    Engine.resetBracket(t); currentRound = 0; overviewOn = false; render();
  }
  function deleteTournament() {
    const t = Store.active(); if (!t) return;
    if (!confirm('«' + t.name + '» برای همیشه حذف شود؟')) return;
    Store.deleteTournament(t.id); currentRound = 0; overviewOn = false; render();
  }
  function duplicateTournament() {
    const t = Store.active(); if (!t) return;
    Store.duplicateTournament(t.id); render();
  }

  /* ---------- مودال ---------- */
  function initShell() {
    const tb = $('themeBtn');
    if (tb) tb.addEventListener('click', () => { buzz(12); toggleTheme(); });
    const bar = $('appbar'), views = $('views');
    if (bar && views) {
      const onScroll = () => bar.classList.toggle('scrolled', views.scrollTop > 4);
      views.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!$('modalOverlay').classList.contains('hidden')) { closeModal(); return; }
        if ($('drawer').classList.contains('open')) closeDrawer();
        return;
      }
      if (e.key === 'Enter' && !$('modalOverlay').classList.contains('hidden')) {
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' && e.target.type === 'number' && $('mt_a')) { e.preventDefault(); saveMatchResult($('mt_a').dataset.matchId || currentMatchId); }
      }
    });
    syncThemeUI();
    loadZoom();
  }

  function openModal(html) {
    $('modal').innerHTML = html;
    $('modalOverlay').classList.remove('hidden');
    lastFocus = document.activeElement;
    setTimeout(() => {
      const f = $('modal').querySelector('input:not([type=hidden]),select,textarea,button');
      if (f && !reducedMotion()) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
    }, 60);
  }
  function closeModal() {
    $('modalOverlay').classList.add('hidden');
    const m = $('modal');
    if (m) m.style.transform = '';
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
    lastFocus = null;
  }
  let lastFocus = null;

  function initGestures() {
    const modal = $('modal'), views = $('views'), ptr = $('ptr');
    if (!modal || !views) return;
    let sy = 0, dy = 0, dragging = false;
    modal.addEventListener('touchstart', e => {
      if (modal.scrollTop <= 0) { sy = e.touches[0].clientY; dragging = true; dy = 0; }
    }, { passive: true });
    modal.addEventListener('touchmove', e => {
      if (!dragging) return;
      dy = e.touches[0].clientY - sy;
      if (dy > 0) { modal.style.transform = 'translateY(' + Math.min(dy, 220) + 'px)'; }
    }, { passive: true });
    const endSheet = () => {
      if (!dragging) return;
      dragging = false;
      modal.style.transform = '';
      if (dy > 120) closeModal();
      dy = 0;
    };
    modal.addEventListener('touchend', endSheet);
    modal.addEventListener('touchcancel', endSheet);

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

  const dlg = (label, inner) => '<div class="form-row"><span class="label">' + label + '</span>' + inner + '</div>';

  function openTournamentDialog(edit) {
    const t = edit ? Store.active() : null;
    UI._tColor = t ? (t.color || '') : '';
    const swHtml = '<button type="button" class="sw auto' + (!UI._tColor ? ' sel' : '') + '" title="خودکار" onclick="UI.pickColor(this,\'\')"></button>' +
      SPORT_PALETTE.map(c => '<button type="button" class="sw' + (UI._tColor === c ? ' sel' : '') + '" style="background:' + c + '" onclick="UI.pickColor(this,\'' + c + '\')"></button>').join('');
    openModal('<h2>' + (t ? 'ویرایش تورنمنت' : 'تورنمنت جدید') + '</h2>' +
      dlg('نام تورنمنت', '<input id="f_name" class="field" value="' + esc(t ? t.name : '') + '" placeholder="مثال: جام رمضان">') +
      dlg('رشته ورزشی', '<select id="f_sport" class="field">' +
      Object.keys(SPORTS).map(k => '<option value="' + k + '"' + (t && t.sport === k ? ' selected' : '') + '>' + SPORTS[k] + '</option>').join('') + '</select>') +
      dlg('نوع جدول', '<select id="f_format" class="field"' + (t && t.rounds.length ? ' disabled' : '') + '>' +
      '<option value="single"' + (!t || (t.format !== 'double' && t.format !== 'asian' && t.format !== 'round') ? ' selected' : '') + '>تک‌حذفی (فصل ۲)</option>' +
      '<option value="asian"' + (t && t.format === 'asian' ? ' selected' : '') + '>آسیایی (فصل ۳) — تا ۱۱ تیم</option>' +
      '<option value="double"' + (t && t.format === 'double' ? ' selected' : '') + '>دو‌حذفی (فصل ۴)</option>' +
      '<option value="round"' + (t && t.format === 'round' ? ' selected' : '') + '>دوره‌ای (فصل ۵) — همه با هم</option></select>') +
      dlg('ظرفیت جدول', '<select id="f_size" class="field">' +
      [4, 8, 16, 32, 64].map(n => '<option value="' + n + '"' + (t && t.targetSize === n ? ' selected' : '') + '>' + n + ' تیم</option>').join('') + '</select>') +
      dlg('تاریخ شروع', '<input type="date" id="f_start" class="field" value="' + (t ? (t.startDate || '') : '') + '">') +
      dlg('محل برگزاری', '<input id="f_place" class="field" value="' + esc(t ? (t.place || '') : '') + '">') +
      dlg('نوع امتیاز', '<select id="f_scoring" class="field">' +
      [['goals', 'گل'], ['points', 'امتیاز'], ['sets', 'ست']].map(o => '<option value="' + o[0] + '"' + (t && t.settings.scoring === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>') +
      dlg('فرمت هر تقابل', '<select id="f_series" class="field">' +
      [[1, 'تک‌بازی'], [3, 'بهترین از ۳'], [5, 'بهترین از ۵'], [7, 'بهترین از ۷']].map(o => '<option value="' + o[0] + '"' + (t && t.settings.series === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>') +
      dlg('قرعه استراحت', '<select id="f_bye" class="field">' +
      '<option value="top"' + (t && t.settings.byeTo === 'top' ? ' selected' : '') + '>به سیدهای بالا</option>' +
      '<option value="random"' + (t && t.settings.byeTo === 'random' ? ' selected' : '') + '>تصادفی</option></select>') +
      dlg('رنگ تورنمنت (خودکار = رنگ رشته)', '<div class="swatches" id="t_sw">' + swHtml + '</div>') +
      '<div class="modal-btns"><button class="action primary" onclick="UI.saveTournament(' + (t ? '\'' + t.id + '\'' : 'null') + ')">ذخیره</button>' +
      '<button class="action" onclick="UI.closeModal()">انصراف</button></div>');
  }
  function pickColor(el, c) {
    UI._tColor = c || '';
    const box = $('t_sw');
    if (box) box.querySelectorAll('.sw').forEach(b => b.classList.remove('sel'));
    if (el) el.classList.add('sel');
  }
  function saveTournament(id) {
    const data = { name: $('f_name').value, sport: $('f_sport').value, format: $('f_format') ? $('f_format').value : 'single', targetSize: $('f_size').value, startDate: $('f_start').value, place: $('f_place').value, color: UI._tColor || null };
    if (!data.name.trim()) { alert('نام تورنمنت الزامی است.'); return; }
    if (id) {
      const t = Store.active();
      const patch = Object.assign({}, data);
      if (t && !t.rounds.length) {
        patch.settings = Object.assign({}, t.settings, { scoring: $('f_scoring').value, series: parseInt($('f_series').value, 10), byeTo: $('f_bye').value });
        patch.format = data.format;
      } else delete patch.format;
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
      dlg('نام تیم / بازیکن', '<input id="tm_name" class="field" value="' + esc(tm ? tm.name : '') + '">') +
      dlg('مربی / سرپرست', '<input id="tm_coach" class="field" value="' + esc(tm ? (tm.coach || '') : '') + '">') +
      dlg('تلفن', '<input id="tm_phone" class="field" inputmode="tel" value="' + esc(tm ? (tm.phone || '') : '') + '">') +
      dlg('سید / رنکینگ (۱ = قوی‌ترین)', '<input id="tm_rank" class="field" type="number" min="1" value="' + (tm && tm.rank ? tm.rank : '') + '" placeholder="مثلاً ۱">') +
      dlg('لوگو / عکس تیم', '<input type="file" id="tm_photo" class="field" accept="image/*" onchange="UI.onPhotoInput(this,\'tm_prev\',\'_teamPhoto\')">' +
      '<img id="tm_prev" class="photo-prev' + (UI._teamPhoto ? '' : ' hidden') + '" src="' + (UI._teamPhoto || '') + '">') +
      '<div class="modal-btns"><button class="action primary" onclick="UI.saveTeam(\'' + t.id + '\',' + (tm ? '\'' + tm.id + '\'' : 'null') + ')">ذخیره</button>' +
      '<button class="action" onclick="UI.closeModal()">انصراف</button></div>');
  }
  function saveTeam(tid, teamId) {
    const d = { name: $('tm_name').value, coach: $('tm_coach').value, phone: $('tm_phone').value, rank: $('tm_rank').value, photo: UI._teamPhoto || null };
    if (teamId) Store.updateTeam(tid, teamId, d); else Store.addTeam(tid, d);
    UI._teamPhoto = null;
    closeModal(); render();
  }

  function openBulkDialog() {
    const t = Store.active(); if (!t) return;
    openModal('<h2>افزودن گروهی</h2>' +
      dlg('هر خط یک تیم (یا فایل CSV با ستون نام)', '<textarea id="bulk" class="field" rows="8" placeholder="استقلال\nپرسپولیس\nسپاهان"></textarea>') +
      '<div class="form-row"><input type="file" id="bulkFile" class="field" accept=".csv,.txt" onchange="UI.bulkFile(this)"></div>' +
      '<div class="modal-btns"><button class="action primary" onclick="UI.saveBulk(\'' + t.id + '\')">افزودن</button>' +
      '<button class="action" onclick="UI.closeModal()">انصراف</button></div>');
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

  let drawMethod = 'lottery', manualOrder = [], drawSeeded = 4;
  const DRAW_METHODS = {
    lottery: 'الف) قرعه‌کشی (شانسی)',
    seeding: 'ب) سیدگذاری (هدفمند کتابی)',
    combined: 'ج) ترکیبی (سید + قرعه)'
  };
  function openDrawDialog() {
    const t = Store.active(); if (!t) return;
    if (t.teams.length < 2) { alert('حداقل ۲ تیم ثبت کن.'); switchView('teams'); return; }
    drawMethod = t.drawMethod && DRAW_METHODS[t.drawMethod] ? t.drawMethod : 'lottery';
    if (drawMethod === 'random') drawMethod = 'lottery';
    if (drawMethod === 'ranked') drawMethod = 'seeding';
    if (drawMethod === 'pro') drawMethod = 'combined';
    manualOrder = t.teams.map(x => x.id);
    drawSeeded = t.drawSeeded || Engine.defaultSeeded(t.teams.length);
    const dbl = Engine.isDouble(t);
    const asn = Engine.isAsian(t);
    const rr = Engine.isRoundRobin(t);
    const info = dbl ? Engine.deCalcInfo(t.teams.length) : (asn ? Engine.asianCalcInfo(t.teams.length) : rr ? Engine.roundCalcInfo(t.teams.length) : Engine.calcInfo(t.teams.length));
    const fmtName = dbl ? 'دو حذفی ' : (asn ? 'آسیایی ' : rr ? 'دوره‌ای ' : '');
    openModal('<h2>چیدمان جدول ' + fmtName + '(' + Engine.faNum(t.teams.length) + ' تیم' + (rr ? '' : ' → مبنای ' + Engine.faNum(info.base)) + ')' +
      (rr
        ? '<br><small class="muted">' + Engine.faNum(info.rounds) + ' دور • ' + Engine.faNum(info.perRound) + ' مسابقه در هر دور • ' + Engine.faNum(info.total) + ' مسابقه</small>'
        : (info.byes ? '<br><small class="muted">' + Engine.faNum(info.byes) + ' استراحت (B) • ' + Engine.faNum(info.rounds) + ' دور • ' + Engine.faNum(info.total) + ' مسابقه</small>' : '<br><small class="muted">بدون استراحت • ' + Engine.faNum(info.rounds) + ' دور</small>')) + '</h2>' +
      '<div class="panel pad calc-panel">' +
      (dbl
        ? '📐 محاسبات فصل چهارم: جدول برنده‌ها ' + Engine.faNum(info.wbMatches) + ' بازی • جدول بازنده‌ها ' + Engine.faNum(info.lbMatches) + ' بازی • فینال بزرگ ۱ • کل ' + Engine.faNum(info.total) + ' (۲n−۲)'
        : asn
          ? '📐 محاسبات فصل سوم: دور اول ' + Engine.faNum(info.firstMatches) + ' بازی • جدول جلو (مقام ۱ تا ' + Engine.faNum(info.front) + '): ' + Engine.faNum(info.front) + ' تیم • پشت جدول (مقام ' + Engine.faNum(info.front + 1) + ' تا ' + Engine.faNum(info.base) + '): ' + Engine.faNum(info.back) + ' تیم • کل بازی‌ها ' + Engine.faNum(info.total)
          : rr
            ? '📐 محاسبات فصل پنجم: هر تیم ' + Engine.faNum(info.perTeam) + ' بازی (n−۱) • ' + Engine.faNum(info.rounds) + ' دور • کل مسابقات ' + Engine.faNum(info.total) + ' (n(n−۱)÷۲) • نتیجه می‌تواند مساوی باشد'
            : '📐 محاسبات کتابی: مبنا ' + Engine.faNum(info.base) + ' (' + '۲ به توان ' + Engine.faNum(info.rounds) + ') • جمع جفت‌سید ' + Engine.faNum(info.sum) + ' • مسابقات دور اول ' + Engine.faNum(info.firstMatches)) + '</div>' +
      dlg('روش چیدمان (فصل دوم کتاب)', '<select id="draw_method" class="field" onchange="UI.drawPreview()">' +
      '<option value="lottery"' + (drawMethod === 'lottery' ? ' selected' : '') + '>الف) قرعه‌کشی — بدون توجه به رتبه</option>' +
      '<option value="seeding"' + (drawMethod === 'seeding' ? ' selected' : '') + '>ب) سیدگذاری — ۱ قوی‌ترین، جمع‌ها ' + Engine.faNum(info.sum) + '</option>' +
      '<option value="combined"' + (drawMethod === 'combined' ? ' selected' : '') + '>ج) ترکیبی — چند سید اول + بقیه قرعه</option>' +
      '<option value="manual"' + (drawMethod === 'manual' ? ' selected' : '') + '>دستی (ترتیب دلخواه با ▲▼)</option></select>') +
      '<div id="seededWrap">' + dlg('تعداد سیدهای مشخص (ترکیبی)', '<select id="draw_seeded" class="field" onchange="UI.drawSeededChg()">' +
      [2, 4, 8].filter(k => k <= t.teams.length).map(k => '<option value="' + k + '"' + (drawSeeded === k ? ' selected' : '') + '>' + Engine.faNum(k) + ' سید اول (S1 تا S' + Engine.faNum(k) + ')</option>').join('') + '</select>') + '</div>' +
      dlg('استراحت (B)', '<select id="draw_bye_display" class="field">' +
      '<option value="higher"' + ((t.settings.byeDisplay || 'higher') === 'higher' ? ' selected' : '') + '>روش توان بالاتر — با نوشتن B</option>' +
      '<option value="lower"' + (t.settings.byeDisplay === 'lower' ? ' selected' : '') + '>روش توان کمتر/پیشرفته — بدون B (فشرده)</option></select>') +
      dlg('قرعه استراحت به', '<select id="draw_bye" class="field">' +
      '<option value="top"' + ((t.settings.byeTo || 'top') === 'top' ? ' selected' : '') + '>سیدهای بالا (کتابی)</option>' +
      '<option value="random"' + (t.settings.byeTo === 'random' ? ' selected' : '') + '>تصادفی</option></select>') +
      '<div id="drawPreview" class="seed-list"></div>' +
      '<p class="hint-note">⚖️ نکته کتابی: هم‌باشگاهی/هم‌شهری‌ها در دور اول حریف هم نشوند؛ در صورت نیاز جای دو سید نزدیک (مثل ۵↔۶ یا ۹↔۱۰) را بعداً جابه‌جا کن. سید ۱ بالا و سید ۲ پایین جدول می‌نشیند تا فینال زودرس نشود.</p>' +
      '<div class="modal-btns"><button class="action primary" onclick="UI.doDraw()">تأیید و ساخت جدول کتابی</button>' +
      '<button class="action" onclick="UI.closeModal()">انصراف</button></div>' +
      (t.rounds.length ? '<button class="action small u-mt-2 u-w-full" onclick="UI.openSwapDialog()">🔀 جابه‌جایی دو سید نزدیک (بدون قرعه مجدد)</button>' : ''));
    drawPreview();
  }
  function drawSeededChg() { drawSeeded = parseInt($('draw_seeded').value, 10) || 4; drawPreview(); }
  function pairLabel(t, id) {
    if (!id) return '—';
    if (id === 'BYE') return 'B (استراحت)';
    const s = Engine.seedOf(t, id);
    const tm = teamById(t, id);
    return (s ? 'S' + Engine.faNum(s) + ' ' : '') + (tm ? tm.name : '?');
  }
  function drawPreview() {
    const t = Store.active();
    drawMethod = $('draw_method').value;
    $('seededWrap').style.display = drawMethod === 'combined' ? '' : 'none';
    const info = Engine.calcInfo(t.teams.length);
    let arr;
    if (drawMethod === 'seeding' || drawMethod === 'combined') arr = [...t.teams].sort((a, b) => rankVal(a.rank) - rankVal(b.rank));
    else if (drawMethod === 'manual') arr = manualOrder.map(id => teamById(t, id)).filter(Boolean);
    else arr = [...t.teams];
    // پیش‌نمایش جفت‌های دور اول بر اساس همان موتور چیدمان
    let pairsHtml = '';
    try {
      const pairs = Engine.previewPairs(t, drawMethod, drawSeeded);
      pairsHtml = '<p class="pairs-title">جفت‌های دور اول (' + Engine.faNum(pairs.length) + ' بازی):</p>' +
        '<div class="pairs-grid">' +
        pairs.map(p => '<div class="pair-chip">' +
          esc(pairLabel(t, p.a)) + ' ‹› ' + esc(pairLabel(t, p.b)) + '</div>').join('') + '</div>';
    } catch (e) {}
    $('drawPreview').innerHTML = pairsHtml +
      '<p class="pairs-title">' +
      (drawMethod === 'lottery' ? 'ترتیب قرعه (تصادفی، بالا→پایین روی جدول خام):' : drawMethod === 'seeding' ? 'ترتیب سیدها (S1 قوی‌ترین، بالا→پایین):' : drawMethod === 'combined' ? Engine.faNum(drawSeeded) + ' سید اول سر جای کتابی، بقیه قرعه:' : 'ترتیب دستی:') + '</p>' +
      arr.map((tm, i) =>
      '<div class="seed-item"><span class="pos">S' + Engine.faNum(tm.rank || (i + 1)) + '</span><span class="nm">' + esc(tm.name) + '</span>' +
      (drawMethod === 'manual' ? '<button class="mini" onclick="UI.manualMove(' + i + ',-1)">▲</button><button class="mini" onclick="UI.manualMove(' + i + ',1)">▼</button>' : '') +
      '</div>').join('');
  }
  function manualMove(i, d) {
    const t = Store.active();
    const j = i + d;
    if (j < 0 || j >= manualOrder.length) return;
    [manualOrder[i], manualOrder[j]] = [manualOrder[j], manualOrder[i]];
    const arr = manualOrder.map(id => teamById(t, id)).filter(Boolean);
    $('drawPreview').innerHTML = arr.map((tm, k) =>
      '<div class="seed-item"><span class="pos">' + Engine.faNum(k + 1) + '</span><span class="nm">' + esc(tm.name) + '</span>' +
      '<button class="mini" onclick="UI.manualMove(' + k + ',-1)">▲</button><button class="mini" onclick="UI.manualMove(' + k + ',1)">▼</button></div>').join('');
  }
  function doDraw() {
    const t = Store.active();
    if (t.rounds.length && !confirm('جدول فعلی و نتایج پاک و دوباره چیدمان شود؟')) return;
    if (drawMethod === 'manual') {
      t.teams.sort((a, b) => manualOrder.indexOf(a.id) - manualOrder.indexOf(b.id));
    }
    t.settings.byeTo = $('draw_bye').value;
    t.settings.byeDisplay = $('draw_bye_display').value;
    Store.save();
    const opts = drawMethod === 'combined' ? { seededCount: drawSeeded } : {};
    if (Engine.generateBracket(t, drawMethod, opts)) { buzz(25); closeModal(); currentRound = 0; overviewOn = false; switchView('bracket'); }
  }

  function openSwapDialog() {
    const t = Store.active(); if (!t || !t.rounds.length) return;
    const opts = t.teams.map(tm => '<option value="' + tm.id + '">' + esc(tm.name) + ' (سید ' + Engine.faNum(tm.rank || '—') + ')</option>').join('');
    openModal('<h2>جابه‌جایی دو سید نزدیک</h2><p class="note-block">نکته کتابی: هم‌باشگاهی/هم‌شهری‌ها دور اول به هم نخورند؛ جای جفت‌سیدهای نزدیک (مثل ۵↔۶ یا ۹↔۱۰) را عوض کن. نتایج ثبت‌شده پاک می‌شود.</p>' +
      dlg('سید اول', '<select id="sw_a" class="field">' + opts + '</select>') +
      dlg('سید دوم', '<select id="sw_b" class="field">' + opts + '</select>') +
      '<div class="modal-btns"><button class="action primary" onclick="UI.doSwap()">جابجا کن</button>' +
      '<button class="action" onclick="UI.closeModal()">انصراف</button></div>');
  }
  function doSwap() {
    const t = Store.active();
    if ($('sw_a').value === $('sw_b').value) { alert('دو تیم متفاوت انتخاب کن.'); return; }
    if (!confirm('نتایج پاک می‌شود. ادامه؟')) return;
    Engine.swapTeams(t, $('sw_a').value, $('sw_b').value);
    closeModal(); render();
  }

  function gameUnitLabel(t) {
    return t.settings.scoring === 'sets' ? 'ست' : t.settings.scoring === 'points' ? 'دست' : 'بازی';
  }
  function openRepMatchDialog(t, matchId) {
    const m = Engine.findMatch(t, matchId);
    if (!m) return;
    const aN = m.a === 'BYE' ? 'B (استراحت)' : Engine.teamName(t, m.a);
    const bN = m.b === 'BYE' ? 'B (استراحت)' : Engine.teamName(t, m.b);
    const isPlayoff = t.repechage && t.repechage.playoff && t.repechage.playoff.id === matchId;
    const w = m.status === 'done' && m.result ? m.result.winner : null;
    openModal('<h2>' + (isPlayoff ? 'پل‌آف سوم 🥉' : 'بازی شانس مجدد') + '</h2>' +
      '<p class="note">' + esc(aN) + ' — ' + esc(bN) + '</p>' +
      (m.a && m.b && m.a !== 'BYE' && m.b !== 'BYE'
        ? '<div class="btn-row">' +
        '<button class="action flex1' + (w === m.a ? ' primary' : '') + '" onclick="UI.pickRepWinnerDialog(\'' + matchId + '\',\'' + m.a + '\')">' + esc(aN) + ' برد</button>' +
        '<button class="action flex1' + (w === m.b ? ' primary' : '') + '" onclick="UI.pickRepWinnerDialog(\'' + matchId + '\',\'' + m.b + '\')">' + esc(bN) + ' برد</button></div>'
        : '<p class="placeholder">این بازی با قرعه استراحت (B) تعیین شده است.</p>') +
      '<div class="modal-btns"><button class="action" onclick="UI.closeModal()">بستن</button></div>');
  }
  function pickRepWinnerDialog(mid, wid) {
    const t = Store.active(); if (!t) return;
    let g = 'champ';
    if (t.repechage && t.repechage.playoff && t.repechage.playoff.id === mid) g = 'playoff';
    else {
      if (t.repechage.champBracket.rounds.some(rd => rd.matches.some(m => m.id === mid))) g = 'champ';
      else g = 'runner';
    }
    if (Engine.setRepechageResult(t, g, mid, wid)) { buzz(15); closeModal(); render(); }
  }
  function openMatchDialog(matchId) {
    const t = Store.active();
    const m = Engine.findMatch(t, matchId);
    if (!m) return;
    currentMatchId = matchId;
    // بازی شانس مجدد (رپشاژ) → دیالوگ ساده انتخاب برنده
    if (Engine.isRepechageMatch(t, matchId)) { openRepMatchDialog(t, matchId); return; }
    UI._matchPhoto = m.photo || null;
    const aN = Engine.teamName(t, m.a), bN = Engine.teamName(t, m.b);
    const canPlay = m.a && m.b && m.a !== 'BYE' && m.b !== 'BYE';
    const series = t.settings.series || 1;
    const sc = t.settings.scoring === 'goals' ? 'گل' : t.settings.scoring === 'sets' ? 'ست' : 'امتیاز';
    const num = Engine.matchNumber(t, m.id);
    const stepRow = (label, id, val) => '<div class="form-row"><span class="label">' + label + '</span><div class="stepper">' +
      '<button type="button" onclick="UI.stepScore(\'' + id + '\',1)" aria-label="زیاد کردن ' + esc(label) + '">＋</button>' +
      '<input id="' + id + '" class="field" type="number" min="0" value="' + val + '">' +
      '<button type="button" onclick="UI.stepScore(\'' + id + '\',-1)" aria-label="کم کردن ' + esc(label) + '">−</button></div></div>';
    const presetRow = '<div class="preset-row" role="group" aria-label="نتیجه‌های آماده">' +
      [['0', '0'], ['1', '0'], ['2', '0'], ['2', '1'], ['1', '1'], ['3', '2']].map(p =>
        '<button type="button" class="preset" onclick="UI.setPreset(\'' + p[0] + '\',\'' + p[1] + '\')">' + Engine.faNum(p[0]) + '–' + Engine.faNum(p[1]) + '</button>').join('') + '</div>';

    let scoreHtml = '';
    if (series > 1) {
      const unit = gameUnitLabel(t);
      scoreHtml = '<div id="scoreBox"><p class="note">نتیجه هر ' + unit + ' (برد ' + Engine.faNum(Math.ceil(series / 2)) + ' از ' + Engine.faNum(series) + '):</p>';
      for (let i = 0; i < series; i++) {
        const g = (m.games && m.games[i]) || {};
        scoreHtml += '<div class="game-row"><span class="gl">' + unit + ' ' + Engine.faNum(i + 1) + '</span>' +
          '<input id="gm_a_' + i + '" class="field" type="number" min="0" placeholder="' + esc(aN) + '" value="' + (g.a === null || g.a === undefined ? '' : g.a) + '">' +
          '<span>-</span>' +
          '<input id="gm_b_' + i + '" class="field" type="number" min="0" placeholder="' + esc(bN) + '" value="' + (g.b === null || g.b === undefined ? '' : g.b) + '"></div>';
      }
      scoreHtml += '</div>';
    } else if (t.settings.scoring === 'goals') {
      scoreHtml = '<div id="scoreBox">' +
        stepRow(sc + ' ۹۰ دقیقه — ' + aN, 'mt_a', (m.scoreA === null || m.scoreA === undefined ? '' : m.scoreA)) +
        stepRow(sc + ' ۹۰ دقیقه — ' + bN, 'mt_b', (m.scoreB === null || m.scoreB === undefined ? '' : m.scoreB)) +
        presetRow +
        '<div class="form-row"><span class="label">' + sc + ' وقت اضافه (فقط هنگام تساوی)</span><div class="score-pair">' +
        '<input id="mt_ea" class="field" type="number" min="0" placeholder="' + esc(aN) + '" value="' + (m.etA === null || m.etA === undefined ? '' : m.etA) + '">' +
        '<input id="mt_eb" class="field" type="number" min="0" placeholder="' + esc(bN) + '" value="' + (m.etB === null || m.etB === undefined ? '' : m.etB) + '"></div></div>' +
        '<div class="form-row"><span class="label">پنالتی (فقط در صورت تساوی نهایی)</span><div class="score-pair">' +
        '<input id="mt_pa" class="field" type="number" min="0" placeholder="' + esc(aN) + '" value="' + (m.penA === null || m.penA === undefined ? '' : m.penA) + '">' +
        '<input id="mt_pb" class="field" type="number" min="0" placeholder="' + esc(bN) + '" value="' + (m.penB === null || m.penB === undefined ? '' : m.penB) + '"></div></div></div>';
    } else {
      scoreHtml = '<div id="scoreBox">' +
        stepRow(sc + ' — ' + aN, 'mt_a', (m.scoreA === null || m.scoreA === undefined ? '' : m.scoreA)) +
        stepRow(sc + ' — ' + bN, 'mt_b', (m.scoreB === null || m.scoreB === undefined ? '' : m.scoreB)) +
        presetRow +
        '<div class="form-row"><span class="label">پنالتی (فقط در صورت تساوی)</span><div class="score-pair">' +
        '<input id="mt_pa" class="field" type="number" min="0" placeholder="' + esc(aN) + '" value="' + (m.penA === null || m.penA === undefined ? '' : m.penA) + '">' +
        '<input id="mt_pb" class="field" type="number" min="0" placeholder="' + esc(bN) + '" value="' + (m.penB === null || m.penB === undefined ? '' : m.penB) + '"></div></div></div>';
    }

    const c = m.cards || {};
    const meta = (typeof SPORTS_META !== 'undefined' && (SPORTS_META[t.sport] || SPORTS_META.custom));
    const mv = (m.mvp && typeof m.mvp === 'object') ? m.mvp : { name: Engine.mvpName(m), team: '', stats: {} };
    const mvpStatHtml = meta.mvpStats.map(s => {
      const v = (mv.stats && mv.stats[s.key]) || 0;
      const input = s.type === 'check'
        ? '<select id="ms_' + s.key + '" class="field"><option value="0"' + (!v ? ' selected' : '') + '>ندارد</option><option value="1"' + (v ? ' selected' : '') + '>دارد</option></select>'
        : '<input id="ms_' + s.key + '" class="field" type="number" min="0" value="' + v + '">';
      return '<label class="mvp-stat">' + s.label + input + '</label>';
    }).join('');
    const showScorers = (t.sport === 'football' || t.sport === 'futsal' || t.settings.scoring === 'goals') && series === 1 && canPlay;
    UI._scorers = Array.isArray(m.scorers) ? JSON.parse(JSON.stringify(m.scorers)) : [];
    UI._scCtx = { a: m.a, b: m.b, aN, bN };
    openModal('<h2>' + esc(aN) + ' — ' + esc(bN) + '</h2>' +
      '<p class="note">' + (num ? 'بازی ' + Engine.faNum(num) + ' • ' : '') + esc((m.title || '') + ' • وضعیت: ' + (m.status === 'done' ? 'تمام‌شده' : 'زمان‌بندی‌شده')) + '</p>' +
      (m.result && m.result.type === 'bye' ? '<p>این بازی با قرعه استراحت تعیین شد.</p>' : (
      '<section class="modal-section"><div class="sec-title">⚽ نتیجه بازی</div>' +
      dlg('نوع نتیجه', '<select id="mt_type" class="field" onchange="UI.matchTypeToggle()">' +
        '<option value="score">نتیجه عادی</option>' +
        '<option value="walkover">انصراف یک تیم</option>' +
        '<option value="dq">حذف انضباطی</option></select>') + scoreHtml +
      '<div id="winnerBox" class="hidden form-row"><span class="label">تیم صعودکننده</span><select id="mt_w" class="field">' +
        (canPlay ? '<option value="' + m.a + '">' + esc(aN) + '</option><option value="' + m.b + '">' + esc(bN) + '</option>' : '') + '</select></div>' +
      '</section>' +
      '<section class="modal-section"><div class="sec-title">📊 آمار بازی</div>' +
      '<div class="form-row"><span class="label">کارت‌ها (زرد / قرمز هر تیم)</span><div class="cards4">' +
        '<label>🟨 ' + esc(aN.slice(0, 8)) + '<input id="mt_ya" type="number" min="0" value="' + (c.ya || 0) + '"></label>' +
        '<label>🟨 ' + esc(bN.slice(0, 8)) + '<input id="mt_yb" type="number" min="0" value="' + (c.yb || 0) + '"></label>' +
        '<label>🟥 ' + esc(aN.slice(0, 8)) + '<input id="mt_ra" type="number" min="0" value="' + (c.ra || 0) + '"></label>' +
        '<label>🟥 ' + esc(bN.slice(0, 8)) + '<input id="mt_rb" type="number" min="0" value="' + (c.rb || 0) + '"></label></div></div>' +
      dlg('⭐ بهترین بازیکن میدان (' + meta.name + ')', '<input id="mt_mvp" class="field" value="' + esc(mv.name || '') + '" placeholder="نام بازیکن">') +
      '<div class="mvp-row"><select id="mt_mvp_team" class="field">' +
      '<option value="">تیم: نامشخص</option>' +
      (canPlay ? '<option value="' + m.a + '"' + (mv.team === m.a ? ' selected' : '') + '>' + esc(aN) + '</option><option value="' + m.b + '"' + (mv.team === m.b ? ' selected' : '') + '>' + esc(bN) + '</option>' : '') +
      '</select></div>' +
      '<div class="mvp-stats">' + mvpStatHtml + '</div></section>' +
      (showScorers ? '<section class="modal-section"><div class="sec-title">⚽ گلزن‌ها و پاسورها</div><div id="scorerList"></div>' +
      '<button class="action small" type="button" onclick="UI.addScorerRow()">＋ افزودن بازیکن</button>' +
      '<div id="scorerWarn" class="scorer-warn"></div></section>' : '') +
      '<section class="modal-section"><div class="sec-title">🗓️ زمان‌بندی و توضیحات</div>' +
      dlg('تاریخ', '<input type="date" id="mt_date" class="field" value="' + (m.date || '') + '">') +
      dlg('ساعت', '<input type="time" id="mt_time" class="field" value="' + (m.time || '') + '">') +
      dlg('محل', '<input id="mt_place" class="field" value="' + esc(m.place || '') + '">') +
      dlg('داور', '<input id="mt_ref" class="field" value="' + esc(m.ref || '') + '">') +
      dlg('توضیحات', '<input id="mt_note" class="field" value="' + esc(m.result ? m.result.note || '' : '') + '">') +
      dlg('📎 ضمیمه (عکس سند نتیجه)', '<input type="file" id="mt_photo" class="field" accept="image/*" onchange="UI.onPhotoInput(this,\'mt_prev\',\'_matchPhoto\')">' +
      '<img id="mt_prev" class="photo-prev' + (UI._matchPhoto ? '' : ' hidden') + '" src="' + (UI._matchPhoto || '') + '">' +
      (UI._matchPhoto ? '<button class="action small attach-del" onclick="UI.clearMatchPhoto()">حذف ضمیمه</button>' : '')) +
      '</section>' +
      '<div class="modal-btns">' +
      (m.status === 'done' && !(m.result && m.result.type === 'bye') ? '<button class="action small danger" onclick="UI.clearMatch(\'' + m.id + '\')">↩ پاک کردن نتیجه</button>' : '') +
      '<button class="action small" onclick="Export.pngMatch(\'' + m.id + '\')" aria-label="خروجی عکس این بازی">🖼️</button>' +
      '<button class="action small" onclick="UI.toggleLock(\'' + m.id + '\')">' + (m.locked ? '🔓 باز کردن' : '🔒 قفل') + '</button>' +
      '<button class="action small" onclick="UI.closeModal()">بستن</button></div>' +
      '<div class="modal-foot">' +
      (canPlay && !(m.result && m.result.type === 'bye') ? '<button class="action primary" onclick="UI.saveMatchResult(\'' + m.id + '\')">ثبت نتیجه</button>' : '') +
      '<button class="action" onclick="UI.saveMatchSchedule(\'' + m.id + '\')">ذخیره زمان‌بندی</button></div>')));
    if (showScorers) renderScorerRows();
  }
  function stepScore(id, d) {
    const el = $(id);
    if (!el) return;
    const v = Math.max(0, (parseInt(el.value, 10) || 0) + d);
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    buzz(8);
  }
  function setPreset(a, b) {
    const ea = $('mt_a'), eb = $('mt_b');
    if (ea) { ea.value = a; ea.dispatchEvent(new Event('input', { bubbles: true })); }
    if (eb) { eb.value = b; eb.dispatchEvent(new Event('input', { bubbles: true })); }
    buzz(10);
  }
  function clearMatchPhoto() {
    UI._matchPhoto = '';
    const p = $('mt_prev');
    if (p) { p.src = ''; p.classList.add('hidden'); }
  }
  function scorerTeamOptions(sel) {
    const ctx = UI._scCtx || {};
    const opt = (id, nm) => '<option value="' + id + '"' + (sel === id ? ' selected' : '') + '>' + esc(nm || '') + '</option>';
    return opt(ctx.a, ctx.aN) + opt(ctx.b, ctx.bN);
  }
  function renderScorerRows() {
    const box = $('scorerList');
    if (!box) return;
    box.innerHTML = (UI._scorers || []).map((s, i) =>
      '<div class="game-row"><input class="field g-name" value="' + esc(s.name || '') + '" placeholder="نام بازیکن" oninput="UI.syncScorer(' + i + ',\'name\',this)">' +
      '<select class="field g-team" onchange="UI.syncScorer(' + i + ',\'team\',this)">' + scorerTeamOptions(s.team) + '</select>' +
      '<input class="field g-goal" type="number" min="0" title="گل" placeholder="⚽" value="' + (s.goals || 0) + '" oninput="UI.syncScorer(' + i + ',\'goals\',this)">' +
      '<input class="field g-goal" type="number" min="0" title="پاس گل" placeholder="🅰️" value="' + (s.assists || 0) + '" oninput="UI.syncScorer(' + i + ',\'assists\',this)">' +
      '<button class="mini" type="button" onclick="UI.delScorerRow(' + i + ')">🗑️</button></div>'
    ).join('') || '<p class="placeholder">هنوز ثبت نشده.</p>';
    updateScorerWarn();
  }
  function updateScorerWarn() {
    const w = $('scorerWarn');
    if (!w) return;
    const ctx = UI._scCtx || {};
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
    w.classList.toggle('bad', !!notes.length);
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
    d.note = $('mt_note') ? $('mt_note').value : '';
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
    switchView, render, renderTeams, renderMatches, renderLearn, toggleBracketMode, showRound, toggleOverview, openToolsDialog,
    selectTournament, openDrawer, closeDrawer,
    openTournamentDialog, saveTournament, openTeamDialog, saveTeam, removeTeam,
    openBulkDialog, saveBulk, bulkFile, openDrawDialog, drawPreview, drawSeededChg, manualMove, doDraw,
    openSwapDialog, doSwap,
    openMatchDialog, matchTypeToggle, saveMatchResult, saveMatchSchedule, clearMatch, toggleLock,
    buildRepechage, pickRepWinner, clearRepechage, openRepMatchDialog, pickRepWinnerDialog,
    onPhotoInput, clearMatchPhoto, pickColor, applyBrand,
    buzz, updateFab, moveTabInd, initGestures, initShell, openQuickMenu,
    reducedMotion, isLite, applyPerfFlags,
    addScorerRow, delScorerRow, syncScorer, renderScorerRows,
    zoom, zoomReset, focusStage, saveTournamentSettings, saveAppSettings,
    resetBracket, deleteTournament, duplicateTournament,
    closeModal, applyTheme,
    setTheme, toggleTheme, setStageFilter, setTeamSort, setMatchFilter, stepScore, setPreset, toggleAcc, jumpAcc, updateNavBadge
  };
})();
