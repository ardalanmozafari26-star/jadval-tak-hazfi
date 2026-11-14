/* خروجی: عکس مربعی 1080، چاپ/PDF، بکاپ — مینیمال تمیز، دانلود مستقیم */
const Export = (() => {
  const SQ = 1080, PAD = 48, HEADER_H = 190, FOOTER_H = 90;
  const ROW_H = 88, ROW_GAP = 14, SEC_HEAD_H = 58, SEC_GAP = 24;
  const CONTENT_H = SQ - HEADER_H - FOOTER_H;

  function scoreText(t, m) {
    if (m.status !== 'done' || !m.result) return '—';
    if (m.result.type === 'bye') return 'استراحت (B)';
    if (m.result.type !== 'score') {
      if (m.result.type === 'walkover') return 'انصراف';
      if (m.result.type === 'dq') return 'حذف انضباطی';
      if (m.result.type === 'draw') return 'مساوی';
      if (m.result.type === 'pick') return 'برد';
      return 'حذف';
    }
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

  function pal() {
    const dark = document.documentElement.dataset.theme !== 'light';
    return {
      dark, bg: dark ? '#0e1116' : '#ffffff', card: dark ? '#181e26' : '#f1f5f9',
      line: dark ? '#2a3340' : '#e2e8f0',
      text: dark ? '#f1f4f7' : '#0f172a', muted: dark ? '#a3adba' : '#64748b',
      accent: dark ? '#c4f35b' : '#65a30d', gold: '#ca8a04'
    };
  }
  const cut = (s, n) => { s = String(s == null ? '' : s); if (s.length <= n) return s; let out = s.slice(0, n); // حذف نیم‌فاصلهٔ آویزان برای جلوگیری از به‌هم‌ریختگی حروف
  while (out.length && out.charCodeAt(out.length - 1) === 0x200C) out = out.slice(0, -1); return out + '…'; };
  const fa = n => { try { return Engine.faNum(n); } catch (e) { return String(n); } };
  const safeName = s => String(s || 'tournament').replace(/[\/\\?%*:|"<>]/g, '-').trim().slice(0, 60) || 'tournament';
  const stamp = () => { try { return new Date().toISOString().slice(0, 10); } catch (e) { return 'img'; } };
  function fmtLabel(t) {
    if (!t) return '🏆 جدول تک‌حذفی';
    if (Engine.isDouble(t)) return '🏆 جدول دوحذفی';
    if (Engine.isAsian(t)) return '🏆 جدول آسیایی';
    if (Engine.isRoundRobin(t)) return '🏆 جدول دوره‌ای';
    return '🏆 جدول تک‌حذفی';
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawHeader(c, P, title, sub, fmt) {
    const W = SQ;
    c.textAlign = 'right';
    c.fillStyle = P.text; c.font = 'bold 36px Tahoma, "Noto Sans Arabic", sans-serif';
    c.fillText(cut(title, 30), W - PAD, 78);
    c.fillStyle = P.muted; c.font = '19px Tahoma, "Noto Sans Arabic", sans-serif';
    c.fillText(cut(sub, 58), W - PAD, 116);
    c.textAlign = 'left';
    c.fillStyle = P.accent; c.font = 'bold 21px Tahoma, "Noto Sans Arabic", sans-serif';
    c.fillText(fmt, PAD, 78);
    // خط جداکننده مینیمال
    c.strokeStyle = P.line; c.lineWidth = 2;
    c.beginPath(); c.moveTo(PAD, HEADER_H - 26); c.lineTo(W - PAD, HEADER_H - 26); c.stroke();
  }
  function drawFooter(c, P) {
    const W = SQ;
    c.strokeStyle = P.line; c.lineWidth = 2;
    c.beginPath(); c.moveTo(PAD, SQ - FOOTER_H + 18); c.lineTo(W - PAD, SQ - FOOTER_H + 18); c.stroke();
    let dateStr = '';
    try { dateStr = new Date().toLocaleDateString('fa-IR'); } catch (e) {}
    c.textAlign = 'center'; c.fillStyle = P.muted; c.font = '16px Tahoma, "Noto Sans Arabic", sans-serif';
    c.fillText('ساخته‌شده با جدول تک‌حذفی' + (dateStr ? ' • ' + dateStr : ''), W / 2, SQ - 34);
  }

  /* تقسیم‌بندی ردیف‌ها در صفحات مربعی */
  function paginate(sections) {
    const pages = [];
    let cur = [], used = 0;
    const push = () => { if (cur.length) pages.push(cur); cur = []; used = 0; };
    (sections || []).forEach(s => {
      const rows = (s.rows || []).slice();
      if (!rows.length) {
        if (used + SEC_HEAD_H > CONTENT_H) push();
        cur.push({ head: s.head, rows: [] });
        used += SEC_HEAD_H + SEC_GAP;
        return;
      }
      let idx = 0, first = true;
      while (idx < rows.length) {
        const headCost = first ? SEC_HEAD_H : SEC_HEAD_H;
        if (used + headCost + ROW_H > CONTENT_H) push();
        const head = first ? s.head : (s.head + ' (ادامه)');
        let sec = cur.length && cur[cur.length - 1].head === head ? cur[cur.length - 1] : null;
        if (!sec) { sec = { head, rows: [] }; cur.push(sec); used += headCost; first = false; }
        const room = Math.max(1, Math.floor((CONTENT_H - used) / (ROW_H + ROW_GAP)));
        const take = rows.slice(idx, idx + room);
        sec.rows = sec.rows.concat(take);
        used += take.length * (ROW_H + ROW_GAP);
        idx += take.length;
        if (idx < rows.length) { used += SEC_GAP; push(); }
      }
      used += SEC_GAP;
      if (used > CONTENT_H) push();
    });
    push();
    return pages.length ? pages : [[]];
  }

  function renderSquarePage(title, sub, pageSecs, pageIdx, totalPages, filename) {
    const P = pal();
    const scale = 2;
    const cv = document.createElement('canvas');
    cv.width = SQ * scale; cv.height = SQ * scale;
    const c = cv.getContext('2d');
    c.scale(scale, scale);
    c.fillStyle = P.bg; c.fillRect(0, 0, SQ, SQ);
    const t = Store.active();
    drawHeader(c, P, title, totalPages > 1 ? (sub + ' — صفحه ' + fa(pageIdx + 1) + ' از ' + fa(totalPages)) : sub, fmtLabel(t));
    let y = HEADER_H;
    (pageSecs || []).forEach(s => {
      if (s.head) {
        c.textAlign = 'right'; c.fillStyle = P.accent; c.font = 'bold 22px Tahoma, "Noto Sans Arabic", sans-serif';
        c.fillText(cut(s.head, 40), SQ - PAD, y + 6);
        y += SEC_HEAD_H;
      }
      (s.rows || []).forEach(r => {
        const x = PAD, w = SQ - PAD * 2;
        c.fillStyle = P.card;
        roundRect(c, x, y, w, ROW_H, 18); c.fill();
        c.strokeStyle = P.line; c.lineWidth = 1.5;
        roundRect(c, x, y, w, ROW_H, 18); c.stroke();
        c.textAlign = 'right'; c.fillStyle = P.text; c.font = 'bold 19px Tahoma, "Noto Sans Arabic", sans-serif';
        if (r.sub) {
          c.fillText(cut(r.main, 32), SQ - PAD - 18, y + 36);
          c.fillStyle = P.muted; c.font = '15px Tahoma, "Noto Sans Arabic", sans-serif';
          c.fillText(cut(r.sub, 52), SQ - PAD - 18, y + 64);
        } else {
          c.fillText(cut(r.main, 34), SQ - PAD - 18, y + 55);
        }
        if (r.badge !== undefined && r.badge !== '' && r.badge !== null) {
          c.textAlign = 'left'; c.fillStyle = P.accent; c.font = 'bold 19px Tahoma, "Noto Sans Arabic", sans-serif';
          c.fillText(cut(r.badge, 16), PAD + 18, y + 55);
        }
        y += ROW_H + ROW_GAP;
      });
      y += 6;
    });
    drawFooter(c, P);
    pngDownload(cv.toDataURL('image/png'), filename);
  }

  /* sections: [{head, rows:[{main, sub, badge}]}] — چندصفحه‌ای مربعی */
  function shot(title, sub, sections, filename) {
    return shotSquare(title, sub, sections, filename);
  }
  function shotSquare(title, sub, sections, filenameBase) {
    const pages = paginate(sections);
    const base = String(filenameBase || 'image.png').replace(/\.png$/i, '');
    pages.forEach((pg, i) => {
      const fn = pages.length > 1 ? (base + '-' + (i + 1) + '.png') : (base.endsWith('.png') ? base : base + '.png');
      renderSquarePage(title, sub, pg, i, pages.length, fn);
    });
  }

  /* ---------- دانلود/ذخیره عکس مربعی (روی اندروید هم کار می‌کند) ---------- */
  function pngDownload(dataUrl, filename) {
    const P = capPlugins();
    if (P && P.Filesystem && P.Share) {
      const base64 = String(dataUrl).split(',')[1] || '';
      P.Filesystem.writeFile({ path: filename, data: base64, directory: 'CACHE' })
        .then(() => P.Filesystem.getUri({ path: filename, directory: 'CACHE' }))
        .then(uri => P.Share.share({ title: filename, files: [uri.uri], dialogTitle: 'ذخیرهٔ عکس' }))
        .catch(() => {
          // تلاش برای ذخیرهٔ مستقیم در پوشهٔ دانلود
          P.Filesystem.writeFile({ path: filename, data: base64, directory: 'DOWNLOAD' })
            .then(() => { try { alert('عکس در پوشهٔ دانلود ذخیره شد.'); } catch (e) {} })
            .catch(() => webDownload(dataUrl, filename));
        });
      return;
    }
    webDownload(dataUrl, filename);
  }
  function webDownload(dataUrl, filename) {
    try {
      const a = document.createElement('a');
      a.download = filename;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) { alert('ذخیره عکس ممکن نشد.'); }
  }
  function shareOrDownload(dataUrl, filename) { pngDownload(dataUrl, filename); }
  function dataURLtoBlob(url) {
    const parts = url.split(',');
    const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/png';
    const bin = atob(parts[1]);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  /* ذخیره/اشتراک فایل متنی (بکاپ، CSV) — روی اندروید هم کار می‌کند */
  function textToBase64(text) {
    try { return btoa(unescape(encodeURIComponent(text))); }
    catch (e) {
      let s = unescape(encodeURIComponent(text)), out = '';
      for (let i = 0; i < s.length; i++) out += String.fromCharCode(s.charCodeAt(i) & 0xff);
      return btoa(out);
    }
  }
  function capPlugins() {
    try {
      if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        return window.Capacitor.Plugins || null;
      }
    } catch (e) {}
    return null;
  }
  function shareTextFile(text, filename, mime) {
    const P = capPlugins();
    if (P && P.Filesystem && P.Share) {
      P.Filesystem.writeFile({ path: filename, data: textToBase64(text), directory: 'CACHE' }).then(() =>
        P.Filesystem.getUri({ path: filename, directory: 'CACHE' })
      ).then(uri =>
        P.Share.share({ title: filename, files: [uri.uri], dialogTitle: 'اشتراک‌گذاری فایل' })
      ).catch(() => webTextDownload(text, filename, mime));
      return;
    }
    webTextDownload(text, filename, mime);
  }
  function webTextDownload(text, filename, mime) {
    try {
      const blob = new Blob([text], { type: mime });
      const a = document.createElement('a');
      a.download = filename;
      a.href = URL.createObjectURL(blob);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) { alert('ذخیره فایل ممکن نشد.'); }
  }

  function needT() {
    const t = Store.active();
    if (!t) { alert('تورنمنتی نیست.'); return null; }
    return t;
  }
  function stageList(t) {
    const lower = t.settings && t.settings.byeDisplay === 'lower';
    const vis = m => !m.hidden && !(lower && m.result && m.result.type === 'bye' && m.round === 0);
    const dbl = Engine.isDouble(t), asn = Engine.isAsian(t);
    if (dbl) {
      return t.rounds.map(rd => ({ title: rd.title, matches: rd.matches.filter(vis), kind: 'wb' }))
        .concat((t.lbRounds || []).filter(rd => rd.matches.some(vis)).map(rd => ({ title: rd.title, matches: rd.matches.filter(vis), kind: 'lb' })))
        .concat(t.gf && vis(t.gf) ? [{ title: 'فینال بزرگ', matches: [t.gf], kind: 'gf' }] : []);
    }
    if (asn) {
      return t.rounds.map(rd => ({ title: rd.title, matches: rd.matches.filter(vis), kind: 'wb' }))
        .concat((t.asianRounds || []).filter(rd => rd.matches.some(vis)).map(rd => ({ title: rd.title, matches: rd.matches.filter(vis), kind: 'lb' })));
    }
    return t.rounds.map(rd => ({ title: rd.title, matches: rd.matches.filter(vis), kind: 'wb' }));
  }

  /* ---------- براکت مربعی هیبریدی ---------- */
  function png() {
    const t = needT(); if (!t) return;
    if (!t.rounds.length) { alert('جدولی برای خروجی وجود ندارد.'); return; }
    const stages = stageList(t).filter(s => s.matches.length);
    if (!stages.length) { alert('بازی‌ای برای خروجی نیست.'); return; }
    const base = safeName(t.name) + '-bracket-' + stamp();
    const rr = Engine.isRoundRobin(t);
    // جدول دوره‌ای: براکت دورها + فایل جداگانه جدول لیگ
    if (rr) {
      pngBracketStages(t, stages, base);
      pngLeagueTable(t);
      return;
    }
    if (!pngBracketSingle(t, stages, base + '.png')) {
      pngBracketStages(t, stages, base);
    }
  }
  /* تلاش برای جا دادن کل براکت در یک مربع؛ false یعنی باید تفکیک مرحله‌ای شود */
  function pngBracketSingle(t, stages, filename) {
    const n = stages.length;
    const maxRows = Math.max.apply(null, stages.map(s => s.matches.length).concat([1]));
    const W = SQ - PAD * 2, H = CONTENT_H - 30;
    const gap = n > 1 ? Math.min(36, Math.max(18, Math.floor(W * 0.06 / n))) : 0;
    const colW = n > 1 ? Math.floor((W - (n - 1) * gap) / n) : W;
    const rowH = Math.min(96, Math.floor(H / maxRows) - 10);
    if (colW < 140 || rowH < 54 || maxRows > 12 || n > 5) return false;
    const P = pal();
    const scale = 2;
    const cv = document.createElement('canvas');
    cv.width = SQ * scale; cv.height = SQ * scale;
    const c = cv.getContext('2d');
    c.scale(scale, scale);
    c.fillStyle = P.bg; c.fillRect(0, 0, SQ, SQ);
    drawHeader(c, P, t.name, 'جدول مسابقات', fmtLabel(t));
    const y0 = HEADER_H + 6, hgt = SQ - FOOTER_H - y0 - 8;
    const yOf = (r, i) => {
      const count = stages[r].matches.length || 1;
      const step = hgt / count;
      return y0 + step * i + step / 2 - rowH / 2;
    };
    stages.forEach((rd, r) => {
      const x = PAD + r * (colW + gap);
      c.fillStyle = P.accent; c.font = 'bold 17px Tahoma, "Noto Sans Arabic", sans-serif'; c.textAlign = 'center';
      c.fillText(cut(rd.title, 20), x + colW / 2, y0 - 4);
      rd.matches.forEach((m, i) => {
        const y = yOf(r, i);
        if (rd.kind === 'wb' && r < stages.length - 1 && stages[r + 1].kind === 'wb' && n <= 5) {
          const nx = PAD + (r + 1) * (colW + gap);
          const ny = yOf(r + 1, Math.floor(i / 2)) + rowH / 2;
          c.strokeStyle = P.muted; c.lineWidth = 2;
          c.beginPath();
          c.moveTo(x + colW, y + rowH / 2);
          c.lineTo(x + colW + gap / 2, y + rowH / 2);
          c.lineTo(x + colW + gap / 2, ny);
          c.lineTo(nx, ny);
          c.stroke();
        }
        c.fillStyle = P.card;
        c.strokeStyle = m.status === 'done' ? P.accent : P.line;
        c.lineWidth = 2;
        roundRect(c, x, y, colW, rowH, 12); c.fill(); c.stroke();
        const w = m.status === 'done' && m.result ? m.result.winner : null;
        const ds = (typeof Engine !== 'undefined' && Engine.displayScore) ? Engine.displayScore(m) : { a: m.scoreA, b: m.scoreB };
        drawBracketSide(c, P, t, m.a, ds.a, x, y, colW, rowH, w === m.a && m.a && m.a !== 'BYE', false);
        c.fillStyle = P.muted; c.font = '12px Tahoma, "Noto Sans Arabic", sans-serif'; c.textAlign = 'center';
        c.fillText(cut(scoreText(t, m), 26), x + colW / 2, y + rowH / 2 + 4);
        drawBracketSide(c, P, t, m.b, ds.b, x, y + rowH / 2, colW, rowH, w === m.b && m.b && m.b !== 'BYE', true);
      });
    });
    drawFooter(c, P);
    pngDownload(cv.toDataURL('image/png'), filename);
    return true;
  }
  function drawBracketSide(c, P, t, teamId, score, x, y, colW, rowH, isWin, bottom) {
    const nm = !teamId ? '...' : teamId === 'BYE' ? 'استراحت' : (t.teams.find(v => v.id === teamId) || {}).name || '?';
    c.fillStyle = isWin ? P.accent : P.text;
    c.font = (isWin ? 'bold ' : '') + '15px Tahoma, "Noto Sans Arabic", sans-serif';
    c.textAlign = 'center';
    const yy = y + (bottom ? rowH / 4 + 8 : rowH / 4 + 14);
    const label = cut(nm, Math.max(10, Math.floor(colW / 13))) + (score !== null && score !== undefined && score !== '' ? '  ' + fa(score) : '');
    c.fillText(label, x + colW / 2, yy, colW - 14);
  }
  /* تفکیک مرحله‌ای: هر مرحله یک (یا چند) مربع خوانا */
  function pngBracketStages(t, stages, base) {
    stages.forEach(rd => {
      const rows = rd.matches.map(m => ({
        main: Engine.teamName(t, m.a) + ' — ' + Engine.teamName(t, m.b),
        sub: scoreText(t, m) + (m.date ? ' • ' + Engine.faDate(m.date) : ''),
        badge: mvpShort(m)
      }));
      shotSquare(t.name, rd.title, [{ head: rd.title + ' (' + fa(rd.matches.length) + ' بازی)', rows }], base + '-' + safeName(rd.title));
    });
  }
  function pngLeagueTable(t) {
    const tbl = Engine.leagueTable(t);
    if (!tbl.length) return;
    shotSquare(t.name, 'جدول ثبت نتایج گروه', [
      { head: 'جدول لیگ (امتیاز ← تفاضل ← زده)', rows: tbl.map(r => ({ main: r.name, sub: fa(r.played) + ' بازی • ' + fa(r.won) + ' برد • ' + fa(r.drawn) + ' مساوی • ' + fa(r.lost) + ' باخت • تفاضل ' + fa(r.gd), badge: fa(r.pts) })) }
    ], safeName(t.name) + '-league-' + stamp() + '.png');
  }

  function print() {
    const t = Store.active();
    if (!t || !t.rounds.length) { alert('جدولی برای چاپ وجود ندارد.'); return; }
    window.print();
  }

  /* ---------- پوستر خانه ---------- */
  function pngHome() {
    const t = needT(); if (!t) return;
    if (!t.rounds.length && !t.teams.length) { alert('اطلاعاتی برای پوستر نیست.'); return; }
    const all = Engine.visibleMatches(t);
    const done = all.filter(x => x.m.status === 'done').length;
    const pct = all.length ? Math.round(done / all.length * 100) : 0;
    const fmtSub = Engine.isDouble(t) ? 'جدول دوحذفی' : Engine.isAsian(t) ? 'جدول آسیایی' : Engine.isRoundRobin(t) ? 'جدول دوره‌ای' : 'جدول تک‌حذفی';
    const rows = [
      { main: 'نوع جام', sub: fmtSub, badge: '' },
      { main: 'تیم‌ها', sub: fa(t.teams.length) + ' تیم', badge: fa(t.teams.length) },
      { main: 'بازی‌ها', sub: fa(done) + ' از ' + fa(all.length) + ' انجام‌شده', badge: '٪' + fa(pct) },
      { main: 'گل‌ها', sub: fa(Engine.statsOverview(t).goals) + ' گل ثبت‌شده', badge: '' }
    ];
    if (t.champion) {
      rows.push({ main: '🏆 قهرمان: ' + Engine.teamName(t, t.champion), sub: 'جام به پایان رسید', badge: '👑' });
    } else {
      const next = all.find(x => x.m.status !== 'done' && x.m.a && x.m.b && x.m.a !== 'BYE' && x.m.b !== 'BYE');
      rows.push(next
        ? { main: 'بازی بعدی: ' + Engine.teamName(t, next.m.a) + ' — ' + Engine.teamName(t, next.m.b), sub: next.roundTitle + (next.m.date ? ' • ' + Engine.faDate(next.m.date) : ''), badge: '' }
        : { main: 'در انتظار قرعه‌کشی / ثبت نتیجه', sub: fa(all.length - done) + ' بازی باقی مانده', badge: '' });
    }
    shotSquare(t.name, 'پوستر معرفی جام', [{ head: 'معرفی جام', rows }], safeName(t.name) + '-home-' + stamp() + '.png');
  }

  /* ---------- آمار تفکیکی ---------- */
  function statsPerfRows(t) {
    return t.teams.map(tm => Object.assign({ tm }, Engine.record(t, tm.id)))
      .sort((a, b) => b.won - a.won || (b.gf - b.ga) - (a.gf - a.ga));
  }
  function summarySecs(t) {
    if (Engine.isDouble(t)) {
      const ov = Engine.deOverview(t);
      const fromLB = Engine.deChampFromLosers(t);
      return [{ head: 'خلاصه دوحذفی 🥊', rows: [
        { main: 'جدول برنده‌ها (W)', sub: fa(ov.wbDone) + ' از ' + fa(ov.wb) + ' بازی', badge: '' },
        { main: 'جدول بازنده‌ها (LB)', sub: fa(ov.lbDone) + ' از ' + fa(ov.lb) + ' بازی', badge: '' },
        { main: 'فینال بزرگ', sub: fa(ov.gfDone) + ' از ' + fa(ov.gf), badge: fromLB ? 'قهرمان از LB 👑' : 'قهرمان از W 👑' },
        { main: 'باقی‌مانده', sub: fa(ov.left) + ' بازی', badge: '' },
        { main: 'گل / میانگین', sub: fa(ov.goals) + ' گل', badge: ov.done ? fa((ov.avg || 0).toFixed(1)) : '—' },
        { main: 'استراحت (B)', sub: fa(ov.byes) + ' بازی', badge: '' }
      ] }];
    }
    if (Engine.isAsian(t)) {
      const ov = Engine.statsOverview(t);
      const fb = Engine.asianFrontBack(t);
      const frontDone = fb.front.reduce((n, g) => n + g.matches.filter(m => m.status === 'done').length, 0);
      const frontTotal = fb.front.reduce((n, g) => n + g.matches.length, 0);
      const backDone = fb.back.reduce((n, g) => n + g.matches.filter(m => m.status === 'done').length, 0);
      const backTotal = fb.back.reduce((n, g) => n + g.matches.length, 0);
      return [{ head: 'خلاصه آسیایی 🏯', rows: [
        { main: 'جدول جلو', sub: fa(frontDone) + ' از ' + fa(frontTotal) + ' بازی', badge: '' },
        { main: 'پشت جدول', sub: fa(backDone) + ' از ' + fa(backTotal) + ' بازی', badge: '' },
        { main: 'گل / میانگین', sub: fa(ov.goals) + ' گل', badge: ov.done ? fa((ov.avg || 0).toFixed(1)) : '—' },
        { main: 'استراحت (B)', sub: fa(ov.byes) + ' بازی', badge: '' }
      ] }];
    }
    if (Engine.isRoundRobin(t)) {
      const ov = Engine.rrOverview(t);
      return [{ head: 'خلاصه لیگ 🔄', rows: [
        { main: 'بازی انجام‌شده', sub: fa(ov.done) + ' از ' + fa(ov.total), badge: '' },
        { main: 'باقی‌مانده', sub: fa(ov.left) + ' بازی', badge: '' },
        { main: 'مساوی', sub: fa(ov.draws) + ' بازی', badge: '' },
        { main: 'گل / میانگین', sub: fa(ov.goals) + ' گل', badge: ov.done ? fa((ov.avg || 0).toFixed(1)) : '—' },
        { main: 'امتیاز برد/مساوی/باخت', sub: fa(ov.points.win) + ' / ' + fa(ov.points.draw) + ' / ' + fa(ov.points.loss), badge: '' }
      ] }];
    }
    const ov = Engine.statsOverview(t);
    return [{ head: 'خلاصه تک‌حذفی 🏆', rows: [
      { main: 'بازی انجام‌شده', sub: fa(ov.done) + ' از ' + fa(ov.total), badge: '' },
      { main: 'باقی‌مانده', sub: fa(ov.left) + ' بازی', badge: '' },
      { main: 'گل / میانگین', sub: fa(ov.goals) + ' گل', badge: ov.done ? fa((ov.avg || 0).toFixed(1)) : '—' },
      { main: 'استراحت (B)', sub: fa(ov.byes) + ' بازی', badge: '' }
    ] }];
  }
  function rankSecs(t) {
    const rank = Engine.finalRank(t);
    return [{ head: 'رده‌بندی نهایی', rows: rank.map((r, i) => ({ main: Engine.teamName(t, r.id), sub: r.title, badge: fa(i + 1) })) }];
  }
  function perfSecs(t) {
    if (Engine.isDouble(t)) {
      const board = Engine.deTeamBoard(t);
      return [{ head: 'رکورد W / LB (بدون مساوی)', rows: board.map(r => ({ main: r.tm.name, sub: 'W: ' + fa(r.wW) + ' برد • ' + fa(r.lW) + ' باخت | LB: ' + fa(r.wL) + ' برد • ' + fa(r.lL) + ' باخت', badge: fa(r.losses) + ' باخت' })) }];
    }
    if (Engine.isRoundRobin(t)) {
      const tbl = Engine.leagueTable(t);
      return [{ head: 'جدول لیگ (امتیاز ← تفاضل ← زده)', rows: tbl.map(r => ({ main: r.name, sub: fa(r.played) + ' بازی • ' + fa(r.won) + ' برد • ' + fa(r.drawn) + ' مساوی • ' + fa(r.lost) + ' باخت • تفاضل ' + fa(r.gd), badge: fa(r.pts) })) }];
    }
    const perf = statsPerfRows(t);
    const hl = Engine.isAsian(t);
    return [{ head: 'عملکرد تیم‌ها' + (hl ? ' (ستون بازی پررنگ)' : ' (بدون مساوی)'), rows: perf.map(r => ({ main: r.tm.name + ' • ' + fa(r.played) + ' بازی', sub: fa(r.won) + ' برد • ' + fa(r.lost) + ' باخت', badge: fa(r.gf - r.ga) })) }];
  }
  function scorersSecs(t) {
    const secs = [];
    const mvps = Engine.tournamentMvp(t).slice(0, 8);
    const sc = Engine.scorersTable(t).slice(0, 10);
    secs.push({ head: 'ستارگان ⭐', rows: mvps.length ? mvps.map(p => ({ main: p.name, sub: Engine.teamName(t, p.team) + ' • ' + fa(p.awards) + ' بار', badge: fa(p.main) })) : [{ main: '—', sub: '', badge: '' }] });
    secs.push({ head: '⚽ گلزنان برتر', rows: sc.length ? sc.map(p => ({ main: p.name, sub: Engine.teamName(t, p.team) + ' • ' + fa(p.assists) + ' پاس گل', badge: fa(p.goals) + ' گل' })) : [{ main: '—', sub: 'گلی ثبت نشده', badge: '' }] });
    return secs;
  }
  function specialSecs(t) {
    if (Engine.isDouble(t)) {
      const fromLB = Engine.deChampFromLosers(t);
      const run = fromLB ? Engine.deLoserRun(t, t.champion) : [];
      return [{ head: fromLB ? 'مسیر قهرمان از بازنده‌ها 🔥' : 'قهرمان از برنده‌ها 👑', rows: fromLB
        ? (run.length ? run.map(p => ({ main: Engine.teamName(t, p.opp), sub: 'باخت به قهرمان در ' + p.roundTitle + ' • سطح ' + fa(p.level + 1), badge: scoreText(t, p.m) })) : [{ main: '—', sub: 'زنجیره ثبت نشده', badge: '' }])
        : [{ main: Engine.teamName(t, t.champion || ''), sub: t.champion ? 'بدون باخت تا فینال بزرگ' : 'قهرمان مشخص نیست', badge: '' }] }];
    }
    if (Engine.isAsian(t)) {
      const drops = Engine.asianDropMap(t);
      return [{ head: 'نقشه سقوط مقامی 🪂', rows: drops.length ? drops.slice(0, 14).map(d => ({ main: Engine.teamName(t, d.id), sub: 'باخت در ' + d.roundTitle + ' ← ' + d.band, badge: d.finalRank || '' })) : [{ main: '—', sub: '', badge: '' }] }];
    }
    if (Engine.isRoundRobin(t)) {
      const leaders = Engine.rrLeaderByRound(t);
      const ad = Engine.rrAttackDefence(t);
      const secs = [{ head: 'صدرنشین هفته‌به‌هفته 👑', rows: leaders.length ? leaders.map(L => ({ main: L.title, sub: L.leader ? L.leader.name + ' با ' + fa(L.leader.pts) + ' امتیاز' : '—', badge: '' })) : [{ main: '—', sub: '', badge: '' }] }];
      secs.push({ head: 'بهترین‌ها', rows: ad.attack ? [
        { main: '🔥 حمله: ' + ad.attack.name, sub: fa(ad.attack.gf) + ' زده', badge: '' },
        { main: '🧱 دفاع: ' + ad.defence.name, sub: fa(ad.defence.ga) + ' خورده', badge: '' }
      ] : [{ main: '—', sub: '', badge: '' }] });
      const rank = Engine.finalRank(t);
      secs.push({ head: 'رده‌بندی گروه', rows: rank.map((r, i) => ({ main: Engine.teamName(t, r.id), sub: r.title, badge: fa(i + 1) })) });
      return secs;
    }
    const buckets = Engine.exitBuckets(t);
    const ups = Engine.cupUpsets(t);
    const secs = [{ head: 'حذف‌شدگان به تفکیک دور', rows: buckets.length ? buckets.map(b => ({ main: b.title, sub: b.ids.map(id => Engine.teamName(t, id)).join('، '), badge: fa(b.ids.length) })) : [{ main: '—', sub: '', badge: '' }] }];
    secs.push({ head: 'شگفتی‌های جام 🎯', rows: ups.length ? ups.map(u => ({ main: Engine.teamName(t, u.winner) + ' (سید ' + fa(u.seedW) + ')', sub: 'برد مقابل ' + Engine.teamName(t, u.loser) + ' (سید ' + fa(u.seedL) + ') • ' + u.roundTitle, badge: scoreText(t, u.m) })) : [{ main: '—', sub: 'شگفتی ثبت نشده', badge: '' }] });
    if (t.repechage) {
      secs.push({ head: '🥉 شانس مجدد', rows: [
        { main: 'دسته قهرمان', sub: ((t.repechage.champLosers || []).length ? (t.repechage.champLosers || []).map(id => Engine.teamName(t, id)).join('، ') : '—'), badge: '' },
        { main: 'دسته نایب‌قهرمان', sub: ((t.repechage.runnerLosers || []).length ? (t.repechage.runnerLosers || []).map(id => Engine.teamName(t, id)).join('، ') : '—'), badge: '' }
      ] });
    }
    return secs;
  }

  function pngStats() { return pngStatsSummary(); }
  function guardStats() {
    const t = needT(); if (!t) return null;
    if (!t.rounds.length) { alert('آماری نیست.'); return null; }
    return t;
  }
  function pngStatsSummary() {
    const t = guardStats(); if (!t) return;
    shotSquare(t.name, 'خلاصه آمار', summarySecs(t), safeName(t.name) + '-stats-summary-' + stamp() + '.png');
  }
  function pngStatsRank() {
    const t = guardStats(); if (!t) return;
    shotSquare(t.name, 'رده‌بندی نهایی', rankSecs(t), safeName(t.name) + '-stats-rank-' + stamp() + '.png');
  }
  function pngStatsPerf() {
    const t = guardStats(); if (!t) return;
    shotSquare(t.name, 'عملکرد تیم‌ها', perfSecs(t), safeName(t.name) + '-stats-perf-' + stamp() + '.png');
  }
  function pngStatsScorers() {
    const t = guardStats(); if (!t) return;
    shotSquare(t.name, 'گلزنان و ستارگان', scorersSecs(t), safeName(t.name) + '-stats-scorers-' + stamp() + '.png');
  }
  function pngStatsSpecial() {
    const t = guardStats(); if (!t) return;
    shotSquare(t.name, 'نکات ویژه جام', specialSecs(t), safeName(t.name) + '-stats-special-' + stamp() + '.png');
  }

  function pngTeams() {
    const t = needT(); if (!t) return;
    if (!t.teams.length) { alert('تیمی نیست.'); return; }
    shotSquare(t.name, 'لیست تیم‌ها (' + fa(t.teams.length) + ')', [
      { head: 'تیم‌ها', rows: t.teams.map((tm, i) => ({ main: tm.name, sub: (tm.coach ? 'مربی: ' + tm.coach + ' • ' : '') + 'سید ' + fa(tm.rank), badge: fa(i + 1) })) }
    ], safeName(t.name) + '-teams-' + stamp() + '.png');
  }
  function pngMatches() {
    const t = needT(); if (!t || !t.rounds.length) { alert('بازی‌ای نیست.'); return; }
    const secs = [];
    let lastRt = '', cur = null;
    Engine.visibleMatches(t).forEach(x => {
      if (x.roundTitle !== lastRt) { cur = { head: x.roundTitle, rows: [] }; secs.push(cur); lastRt = x.roundTitle; }
      const m = x.m;
      cur.rows.push({
        main: Engine.teamName(t, m.a) + ' — ' + Engine.teamName(t, m.b),
        sub: scoreText(t, m) + (m.date ? ' • ' + Engine.faDate(m.date) : ''),
        badge: mvpShort(m)
      });
    });
    // رپشاژ قبلاً در visibleMatches آمده؛ بخش جداگانه لازم نیست
    shotSquare(t.name, 'برنامه و نتایج بازی‌ها', secs, safeName(t.name) + '-matches-' + stamp() + '.png');
  }
  function mvpShort(m) {
    const n = (typeof Engine !== 'undefined' && Engine.mvpName) ? Engine.mvpName(m) : (m.mvp || '');
    return n ? '⭐' + cut(n, 10) : '';
  }
  function pngMatch(matchId) {
    const t = needT(); if (!t) return;
    const m = Engine.findMatch(t, matchId);
    if (!m) return;
    const rows = [{ main: 'نتیجه', sub: scoreText(t, m), badge: '' }];
    if (m.date || m.place) rows.push({ main: 'زمان و مکان', sub: (m.date ? Engine.faDate(m.date) : '') + (m.time ? ' ' + m.time : '') + (m.place ? ' • ' + m.place : ''), badge: '' });
    if (m.ref) rows.push({ main: 'داور', sub: m.ref, badge: '' });
    const mn = Engine.mvpName(m);
    if (mn) rows.push({ main: '⭐ ' + mn, sub: Engine.mvpStatsLine(t, m), badge: '' });
    if (Array.isArray(m.scorers) && m.scorers.length) {
      m.scorers.forEach(s => {
        rows.push({ main: '⚽ ' + s.name, sub: Engine.teamName(t, s.team) + ' • ' + fa(s.assists || 0) + ' پاس گل', badge: fa(s.goals || 0) + ' گل' });
      });
    }
    const c = m.cards || {};
    if ((c.ya || c.yb || c.ra || c.rb)) rows.push({ main: 'کارت‌ها', sub: '🟨' + fa((c.ya || 0) + (c.yb || 0)) + ' 🟥' + fa((c.ra || 0) + (c.rb || 0)), badge: '' });
    if (m.result && m.result.note) rows.push({ main: 'توضیح', sub: m.result.note, badge: '' });
    shotSquare(Engine.teamName(t, m.a) + ' — ' + Engine.teamName(t, m.b), t.name, [{ head: 'کارت بازی', rows }], 'match-' + stamp() + '.png');
  }

  function backup() {
    shareTextFile(Store.exportJSON(), 'bracket-backup-' + new Date().toISOString().slice(0, 10) + '.json', 'application/json');
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

  /* ---------- خروجی CSV بازی‌ها و تیم‌ها (با محاسبات فصل دوم + رپشاژ) ---------- */
  function csv() {
    const t = Store.active();
    if (!t) { alert('تورنمنتی نیست.'); return; }
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const dbl = Engine.isDouble(t);
    const asn = Engine.isAsian(t);
    const rr = Engine.isRoundRobin(t);
    const lines = ['\ufeff' + (dbl ? 'جدول دو حذفی' : asn ? 'جدول آسیایی' : rr ? 'جدول دوره‌ای' : 'جدول تک‌حذفی') + ',"' + (t.name || '') + '"'];
    try {
      const mFa = (t.drawMethod === 'seeding' ? 'سیدگذاری' : t.drawMethod === 'combined' ? 'ترکیبی' : t.drawMethod === 'manual' ? 'دستی' : 'قرعه‌کشی');
      if (dbl) {
        const d = Engine.deCalcInfo(t.teams.length);
        lines.push('روش چیدمان,' + q(mFa) + ',مبنا,' + d.base + ',استراحت,' + d.byes + ',برنده‌ها,' + d.wbMatches + ',بازنده‌ها,' + d.lbMatches + ',فینال,' + d.gfMatches + ',کل مسابقات,' + d.total);
      } else if (asn) {
        const a = Engine.asianCalcInfo(t.teams.length);
        lines.push('روش چیدمان,' + q(mFa) + ',مبنا,' + a.base + ',استراحت,' + a.byes + ',دور اول,' + a.firstMatches + ',جدول جلو,' + a.front + ',پشت جدول,' + a.back + ',کل بازی‌ها,' + a.total);
      } else if (rr) {
        const r = Engine.roundCalcInfo(t.teams.length);
        const P = (t.settings && t.settings.points) || { win: 3, draw: 1, loss: 0 };
        lines.push('روش چیدمان,' + q(mFa) + ',تعداد دور,' + r.rounds + ',مسابقه در هر دور,' + r.perRound + ',مسابقات هر تیم,' + r.perTeam + ',کل مسابقات,' + r.total + ',امتیاز برد,' + (P.win || 0) + ',امتیاز مساوی,' + (P.draw || 0) + ',امتیاز باخت,' + (P.loss || 0));
      } else {
        const c = Engine.calcInfo(t.teams.length);
        lines.push('روش چیدمان,' + q(mFa) + ',مبنا,' + c.base + ',دور,' + c.rounds + ',کل مسابقات,' + c.total + ',استراحت,' + c.byes + ',دور اول روی کاغذ,' + c.drawnMatches + ',دور اول واقعی,' + c.realFirst + ',جمع جفت‌سید,' + c.sum);
      }
    } catch (e) {}
    lines.push('مرحله,شماره بازی,تیم اول,تیم دوم,نتیجه,تاریخ,ساعت,محل,داور,بهترین بازیکن');
    Engine.visibleMatches(t).forEach((x, i) => {
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
    if (rr) {
      lines.push('');
      lines.push('جدول ثبت نتایج گروه');
      lines.push(['رتبه', 'تیم', 'بازی', 'برد', 'باخت', 'مساوی', 'زده', 'خورده', 'تفاضل', 'امتیاز'].map(q).join(','));
      Engine.leagueTable(t).forEach(r => {
        lines.push([r.rank, r.name, r.played, r.won, r.lost, r.drawn, r.gf, r.ga, r.gd, r.pts].map(q).join(','));
      });
    }
    lines.push('');
    lines.push('بازیکن,تیم,گل,پاس گل,بازی');
    Engine.scorersTable(t).forEach(p => {
      lines.push([p.name, Engine.teamName(t, p.team), p.goals, p.assists, p.played].map(q).join(','));
    });
    if (t.repechage) {
      lines.push('');
      lines.push('شانس مجدد (رپشاژ),سوم مشترک,' + q((t.repechage.third || []).map(id => Engine.teamName(t, id)).join(' و ')));
      lines.push('دسته,بازیکن/تیم');
      (t.repechage.champLosers || []).forEach(id => lines.push(['بازنده به قهرمان', Engine.teamName(t, id)].map(q).join(',')));
      (t.repechage.runnerLosers || []).forEach(id => lines.push(['بازنده به نایب‌قهرمان', Engine.teamName(t, id)].map(q).join(',')));
    }
    shareTextFile(lines.join('\n'), t.name + '.csv', 'text/csv;charset=utf-8');
  }

  return { png, print, backup, restore, csv, scoreText, pngStats, pngStatsSummary, pngStatsRank, pngStatsPerf, pngStatsScorers, pngStatsSpecial, pngTeams, pngMatches, pngMatch, pngHome, pngLeagueTable };
})();
