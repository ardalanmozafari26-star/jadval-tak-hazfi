/* خروجی: عکس PNG، چاپ/PDF، بکاپ */
const Export = (() => {
  function scoreText(t, m) {
    if (m.status !== 'done' || !m.result) return '—';
    if (m.result.type === 'bye') return 'استراحت';
    if (m.result.type !== 'score') return m.result.type === 'walkover' ? 'انصراف' : 'حذف';
    if ((m.games || []).length && m.seriesWins) {
      const w = m.result.winner === m.a ? m.seriesWins.a + '-' + m.seriesWins.b : m.seriesWins.b + '-' + m.seriesWins.a;
      const det = m.games.filter(g => g.a !== null).map(g => g.a + '-' + g.b).join('، ');
      return 'سری ' + w + (det ? ' (' + det + ')' : '');
    }
    const totA = (m.scoreA || 0) + (m.etA || 0), totB = (m.scoreB || 0) + (m.etB || 0);
    let s = totA + ' - ' + totB;
    if (m.etA !== null && m.etA !== undefined) s += ' (و.ا)';
    if (m.penA !== null && m.penA !== undefined) s += ' پنالتی ' + m.penA + '-' + m.penB;
    return s;
  }

  /* رندر جدول روی کانوس برای خروجی عکس آفلاین */
  function png() {
    const t = Store.active();
    if (!t || !t.rounds.length) { alert('جدولی برای خروجی وجود ندارد.'); return; }
    const rounds = t.rounds;
    const rowH = 64, colW = 250, gap = 46, pad = 40;
    const maxRows = rounds[0].matches.length;
    const H = pad * 2 + maxRows * (rowH + 14);
    const W = pad * 2 + rounds.length * (colW + gap) - gap;
    const cv = document.createElement('canvas');
    const scale = 2;
    cv.width = W * scale; cv.height = H * scale;
    const c = cv.getContext('2d');
    c.scale(scale, scale);
    const dark = document.documentElement.dataset.theme === 'dark';
    c.fillStyle = dark ? '#0f172a' : '#ffffff';
    c.fillRect(0, 0, W, H);
    c.textAlign = 'center';

    // عنوان
    c.fillStyle = dark ? '#f1f5f9' : '#0f172a';
    c.font = 'bold 26px Tahoma';
    c.fillText(t.name, W / 2, 30);

    const yOf = (r, i) => {
      const span = H - pad * 2;
      const count = rounds[r].matches.length;
      const step = span / count;
      return pad + step * i + step / 2 - rowH / 2;
    };

    rounds.forEach((rd, r) => {
      const x = pad + r * (colW + gap);
      c.fillStyle = '#16a34a';
      c.font = 'bold 15px Tahoma';
      c.fillText(rd.title, x + colW / 2, pad + 4);
      rd.matches.forEach((m, i) => {
        const y = yOf(r, i) + 18;
        // خط اتصال به بازی بعد
        if (r < rounds.length - 1) {
          const nx = pad + (r + 1) * (colW + gap);
          const ny = yOf(r + 1, Math.floor(i / 2)) + 18 + rowH / 2;
          c.strokeStyle = '#94a3b8'; c.lineWidth = 2;
          c.beginPath();
          c.moveTo(x + colW, y + rowH / 2);
          c.lineTo(x + colW + gap / 2, y + rowH / 2);
          c.lineTo(x + colW + gap / 2, ny);
          c.lineTo(nx, ny);
          c.stroke();
        }
        // کادر بازی
        c.fillStyle = dark ? '#1e293b' : '#f1f5f9';
        c.strokeStyle = m.status === 'done' ? '#16a34a' : '#94a3b8';
        c.lineWidth = 2;
        roundRect(c, x, y, colW, rowH, 10); c.fill(); c.stroke();
        const w = m.status === 'done' && m.result ? m.result.winner : null;
        const ds = (typeof Engine !== 'undefined' && Engine.displayScore) ? Engine.displayScore(m) : { a: m.scoreA, b: m.scoreB };
        drawSide(c, t, m.a, ds.a, x, y, colW, w === m.a && m.a && m.a !== 'BYE');
        c.fillStyle = '#64748b'; c.font = '11px Tahoma';
        c.fillText(scoreText(t, m), x + colW / 2, y + rowH / 2 + 4);
        drawSide(c, t, m.b, ds.b, x, y + rowH / 2, colW, w === m.b && m.b && m.b !== 'BYE', true);
      });
    });

    const a = document.createElement('a');
    a.download = t.name + '-bracket.png';
    a.href = cv.toDataURL('image/png');
    a.click();
  }

  function drawSide(c, t, teamId, score, x, y, colW, isWin, bottom) {
    const dark = document.documentElement.dataset.theme === 'dark';
    const nm = !teamId ? '...' : teamId === 'BYE' ? 'استراحت' : (t.teams.find(v => v.id === teamId) || {}).name || '?';
    c.fillStyle = isWin ? '#16a34a' : (dark ? '#e2e8f0' : '#0f172a');
    c.font = (isWin ? 'bold ' : '') + '14px Tahoma';
    const yy = y + (bottom ? 0 : rowHpad()) + 20;
    c.fillText(nm.length > 22 ? nm.slice(0, 22) + '…' : nm, x + colW / 2, yy, colW - 16);
  }
  const rowHpad = () => 0;

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function print() {
    const t = Store.active();
    if (!t || !t.rounds.length) { alert('جدولی برای چاپ وجود ندارد.'); return; }
    window.print();
  }

  /* ---------- خروجی عکس عمومی از هر داده ---------- */
  function pal() {
    const dark = document.documentElement.dataset.theme === 'dark';
    return {
      dark, bg: dark ? '#0f172a' : '#ffffff', card: dark ? '#1e293b' : '#f1f5f9',
      text: dark ? '#f1f5f9' : '#0f172a', muted: dark ? '#94a3b8' : '#64748b',
      accent: '#16a34a', gold: '#ca8a04'
    };
  }
  const cut = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; };

  /* sections: [{head, rows:[{main, sub, badge}]}] */
  function shot(title, sub, sections, filename) {
    const P = pal();
    const W = 900, pad = 36;
    let H = 150;
    sections.forEach(s => { H += 52 + s.rows.length * 62 + 16; });
    H += 60;
    const scale = 2;
    const cv = document.createElement('canvas');
    cv.width = W * scale; cv.height = H * scale;
    const c = cv.getContext('2d');
    c.scale(scale, scale);
    c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
    // سربرگ
    c.fillStyle = P.accent; c.fillRect(0, 0, W, 10);
    c.textAlign = 'right';
    c.fillStyle = P.text; c.font = 'bold 30px Tahoma';
    c.fillText(cut(title, 34), W - pad, 62);
    c.fillStyle = P.muted; c.font = '16px Tahoma';
    c.fillText(cut(sub, 60), W - pad, 94);
    c.fillStyle = P.gold; c.font = 'bold 20px Tahoma'; c.textAlign = 'left';
    c.fillText('🏆 جدول تک حذفی', pad, 62);
    let y = 130;
    sections.forEach(s => {
      c.textAlign = 'right'; c.fillStyle = P.accent; c.font = 'bold 20px Tahoma';
      c.fillText(s.head, W - pad, y);
      y += 14;
      s.rows.forEach(r => {
        c.fillStyle = P.card;
        roundRect(c, pad, y, W - pad * 2, 52, 12); c.fill();
        c.textAlign = 'right'; c.fillStyle = P.text; c.font = 'bold 17px Tahoma';
        c.fillText(cut(r.main, 30), W - pad - 14, y + 24);
        if (r.sub) {
          c.fillStyle = P.muted; c.font = '13px Tahoma';
          c.fillText(cut(r.sub, 44), W - pad - 14, y + 43);
        }
        if (r.badge !== undefined && r.badge !== '') {
          c.textAlign = 'left'; c.fillStyle = P.accent; c.font = 'bold 17px Tahoma';
          c.fillText(cut(r.badge, 16), pad + 14, y + 32);
        }
        y += 62;
      });
      y += 16;
    });
    c.textAlign = 'center'; c.fillStyle = P.muted; c.font = '13px Tahoma';
    try { c.fillText(new Date().toLocaleDateString('fa-IR'), W / 2, H - 22); } catch (e) {}
    shareOrDownload(cv.toDataURL('image/png'), filename);
  }

  function dataURLtoBlob(url) {
    const [head, data] = url.split(',');
    const mime = head.match(/:(.*?);/)[1];
    const bin = atob(data);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  function shareOrDownload(dataUrl, filename) {
    try {
      const file = new File([dataURLtoBlob(dataUrl)], filename, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: filename });
        return;
      }
    } catch (e) {}
    const a = document.createElement('a');
    a.download = filename;
    a.href = dataUrl;
    a.click();
  }

  function needT() {
    const t = Store.active();
    if (!t) { alert('تورنمنتی نیست.'); return null; }
    return t;
  }
  function pngStats() {
    const t = needT(); if (!t || !t.rounds.length) { alert('آماری نیست.'); return; }
    const rank = Engine.finalRank(t);
    const perf = t.teams.map(tm => Object.assign({ tm }, Engine.record(t, tm.id)))
      .sort((a, b) => b.won - a.won || (b.gf - b.ga) - (a.gf - a.ga));
    const mvps = Engine.tournamentMvp(t).slice(0, 5);
    shot(t.name, 'آمار تورنمنت', [
      { head: 'رده‌بندی نهایی', rows: rank.map((r, i) => ({ main: Engine.teamName(t, r.id), sub: r.title, badge: (i + 1) + '' })) },
      { head: 'عملکرد تیم‌ها', rows: perf.map(r => ({ main: r.tm.name, sub: r.won + ' برد • ' + r.lost + ' باخت', badge: (r.gf - r.ga) + '' })) },
      { head: 'ستارگان ⭐', rows: mvps.length ? mvps.map(p => ({ main: p.name, sub: Engine.teamName(t, p.team) + ' • ' + p.awards + ' بار', badge: p.main + '' })) : [{ main: '—', sub: '', badge: '' }] }
    ], t.name + '-stats.png');
  }
  function pngTeams() {
    const t = needT(); if (!t) return;
    if (!t.teams.length) { alert('تیمی نیست.'); return; }
    shot(t.name, 'لیست تیم‌ها (' + t.teams.length + ')', [
      { head: 'تیم‌ها', rows: t.teams.map((tm, i) => ({ main: tm.name, sub: (tm.coach ? 'مربی: ' + tm.coach + ' • ' : '') + 'سید ' + tm.rank, badge: (i + 1) + '' })) }
    ], t.name + '-teams.png');
  }
  function pngMatches() {
    const t = needT(); if (!t || !t.rounds.length) { alert('بازی‌ای نیست.'); return; }
    const secs = [];
    let lastRt = '', cur = null;
    Engine.allMatches(t).forEach(x => {
      if (x.roundTitle !== lastRt) { cur = { head: x.roundTitle, rows: [] }; secs.push(cur); lastRt = x.roundTitle; }
      const m = x.m;
      cur.rows.push({
        main: Engine.teamName(t, m.a) + ' — ' + Engine.teamName(t, m.b),
        sub: Export.scoreText(t, m) + (m.date ? ' • ' + Engine.faDate(m.date) : ''),
        badge: mvpShort(m)
      });
    });
    shot(t.name, 'برنامه و نتایج بازی‌ها', secs, t.name + '-matches.png');
  }
  function mvpShort(m) {
    const n = (typeof Engine !== 'undefined' && Engine.mvpName) ? Engine.mvpName(m) : (m.mvp || '');
    return n ? '⭐' + cut(n, 10) : '';
  }
  function pngMatch(matchId) {
    const t = needT(); if (!t) return;
    const m = Engine.findMatch(t, matchId);
    if (!m) return;
    const rows = [{ main: 'نتیجه', sub: Export.scoreText(t, m), badge: '' }];
    if (m.date || m.place) rows.push({ main: 'زمان و مکان', sub: (m.date ? Engine.faDate(m.date) : '') + (m.time ? ' ' + m.time : '') + (m.place ? ' • ' + m.place : ''), badge: '' });
    if (m.ref) rows.push({ main: 'داور', sub: m.ref, badge: '' });
    const mn = Engine.mvpName(m);
    if (mn) rows.push({ main: '⭐ ' + mn, sub: Engine.mvpStatsLine(t, m), badge: '' });
    const c = m.cards || {};
    if ((c.ya || c.yb || c.ra || c.rb)) rows.push({ main: 'کارت‌ها', sub: '🟨' + ((c.ya || 0) + (c.yb || 0)) + ' 🟥' + ((c.ra || 0) + (c.rb || 0)), badge: '' });
    if (m.result && m.result.note) rows.push({ main: 'توضیح', sub: m.result.note, badge: '' });
    shot(Engine.teamName(t, m.a) + ' — ' + Engine.teamName(t, m.b), t.name, [{ head: 'کارت بازی', rows }], 'match.png');
  }

  function backup() {
    const t = Store.active();
    const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.download = 'bracket-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.href = URL.createObjectURL(blob);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function restore(input) {
    const f = input.files && input.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try { Store.importJSON(rd.result); alert('بکاپ بازیابی شد.'); location.reload(); }
      catch (e) { alert('فایل معتبر نیست.'); }
    };
    rd.readAsText(f);
    input.value = '';
  }

  /* خروجی CSV بازی‌ها و تیم‌ها */
  function csv() {
    const t = Store.active();
    if (!t) { alert('تورنمنتی نیست.'); return; }
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lines = ['\ufeffمرحله,شماره بازی,تیم اول,تیم دوم,نتیجه,تاریخ,ساعت,محل,داور,بهترین بازیکن'];
    Engine.allMatches(t).forEach((x, i) => {
      const m = x.m;
      lines.push([x.roundTitle, i + 1, Engine.teamName(t, m.a), Engine.teamName(t, m.b),
        scoreText(t, m), m.date, m.time, m.place, m.ref, Engine.mvpName(m)].map(q).join(','));
    });
    lines.push('');
    lines.push('تیم,مربی,سید,بازی,برد,باخت,زده,خورده,کارت زرد,کارت قرمز');
    t.teams.forEach(tm => {
      const r = Engine.record(t, tm.id);
      lines.push([tm.name, tm.coach, tm.rank, r.played, r.won, r.lost, r.gf, r.ga, r.y, r.r].map(q).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.download = t.name + '.csv';
    a.href = URL.createObjectURL(blob);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  return { png, print, backup, restore, csv, scoreText, pngStats, pngTeams, pngMatches, pngMatch };
})();
