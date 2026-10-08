/* موتور تک‌حذفی فوق‌حرفه‌ای:
   سیدبندی استاندارد/حرفه‌ای/ترتیبی، BYE هوشمند، سری Best-of،
   وقت اضافه و پنالتی، رتبه‌بندی نهایی، بازی جوانمردانه */
const Engine = (() => {
  const nextPow2 = n => { let p = 2; while (p < n) p *= 2; return p; };
  const seriesNeeded = s => Math.ceil(s / 2);

  function roundTitle(participants) {
    switch (participants) {
      case 2: return 'فینال';
      case 4: return 'نیمه‌نهایی';
      case 8: return 'یک‌چهارم نهایی';
      case 16: return 'یک‌هشتم نهایی';
      case 32: return 'یک‌شانزدهم نهایی';
      case 64: return 'یک‌سی‌ودوم نهایی';
      default: return 'مرحله ' + participants + ' تیمی';
    }
  }
  /* عنوان رتبه مشترک بر اساس تعداد تیم مرحله: 8->پنجم، 16->نهم ... */
  function sharedRankTitle(participants) {
    switch (participants) {
      case 8: return 'پنجم مشترک';
      case 16: return 'نهم مشترک';
      case 32: return 'هفدهم مشترک';
      case 64: return 'سی‌وسوم مشترک';
      default: return 'حذف‌شده در ' + roundTitle(participants);
    }
  }

  /* ترتیب استاندارد سیدبندی: 8 تیمی -> [1,8,4,5,2,7,3,6] */
  function seedOrder(n) {
    let arr = [1];
    while (arr.length < n) {
      const size = arr.length * 2, next = [];
      for (const x of arr) { next.push(x); next.push(size + 1 - x); }
      arr = next;
    }
    return arr;
  }
  const shuffle = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  function mkMatch(r, i, a, b) {
    return {
      id: 'r' + r + 'm' + i, round: r, index: i,
      a: a || null, b: b || null, pa: null, pb: null,
      scoreA: null, scoreB: null, etA: null, etB: null,
      penA: null, penB: null, games: [],
      date: '', time: '', place: '', ref: '',
      cards: { ya: 0, yb: 0, ra: 0, rb: 0 }, mvp: '', photo: null,
      scorers: [],
      status: 'scheduled', result: null, locked: false
    };
  }
  function nextSlot(r, i) { return { r: r + 1, m: Math.floor(i / 2), slot: i % 2 === 0 ? 'a' : 'b' }; }

  function findMatch(t, id) {
    if (!id) return null;
    if (t.thirdPlace && t.thirdPlace.id === id) return t.thirdPlace;
    for (const rd of t.rounds) for (const m of rd.matches) if (m.id === id) return m;
    return null;
  }
  function teamName(t, id) {
    if (!id) return 'نامشخص';
    if (id === 'BYE') return 'استراحت';
    const tm = t.teams.find(x => x.id === id);
    return tm ? tm.name : 'حذف‌شده';
  }

  /* ترتیب سیدها بر اساس روش قرعه‌کشی؛ قرارداد: ۱ قوی‌ترین (عدد کوچک‌تر = قوی‌تر) */
  function orderTeams(t, method) {
    const arr = [...t.teams];
    if (method === 'ranked') arr.sort((x, y) => rankVal(x.rank) - rankVal(y.rank));
    else if (method === 'random' || method === 'pro') {
      const top = method === 'pro' ? arr.splice(0, 0) : null; // pro در چیدمان اعمال می‌شود
      shuffle(arr);
      if (top) void top;
    }
    return arr;
  }

  /* چیدمان استاندارد: سید i در جایگاه seedOrder */
  function placeStandard(ids, n, slots) {
    const seeds = seedOrder(slots);
    return seeds.map(s => (s <= n ? ids[s - 1] : 'BYE'));
  }

  /* چیدمان حرفه‌ای تنیسی: سید ۱ و ۲ سر جای ثابت، بقیه تصادفی */
  function placePro(ids, n, slots) {
    const arr = placeStandard(ids, n, slots);
    const i1 = arr.indexOf(ids[0]);
    const i2 = n > 1 ? arr.indexOf(ids[1]) : -1;
    const movable = [];
    arr.forEach((v, i) => { if (i !== i1 && i !== i2 && v !== 'BYE') movable.push(i); });
    const vals = shuffle(movable.map(i => arr[i]));
    movable.forEach((slot, k) => { arr[slot] = vals[k]; });
    return arr;
  }

  /* چیدمان ترتیبی: BYEها اول به سیدهای بالا، بعد ۱-۲، ۳-۴ ... */
  function placeSequential(ids, n, slots) {
    const byes = slots - n;
    const out = [];
    for (let i = 0; i < byes; i++) { out.push(ids[i], 'BYE'); }
    for (let i = byes; i < n; i++) out.push(ids[i]);
    return out;
  }

  /* BYE تصادفی: بدون جفت BYE-در-برابر-BYE */
  function placeRandomBye(ids, n, slots) {
    const byes = slots - n;
    const pairs = shuffle([...Array(slots / 2).keys()]);
    const byePairs = pairs.slice(0, byes);
    const out = new Array(slots).fill(null);
    const teams = [...ids];
    byePairs.forEach(p => {
      const side = Math.random() < 0.5 ? 0 : 1;
      out[p * 2 + side] = 'BYE';
      out[p * 2 + (1 - side)] = teams.pop();
    });
    for (let i = 0; i < slots; i++) if (out[i] === null) out[i] = teams.pop();
    return out;
  }

  function generateBracket(t, method) {
    const ordered = orderTeams(t, method === 'pro' ? 'ranked' : method);
    const n = ordered.length;
    if (n < 2) { alert('حداقل ۲ تیم لازم است.'); return false; }
    if (n > 64) { alert('حداکثر ۶۴ تیم.'); return false; }
    const slots = nextPow2(n);
    const ids = ordered.map(x => x.id);
    let slotArr;
    if (method === 'sequential') slotArr = placeSequential(ids, n, slots);
    else if (method === 'pro') slotArr = placePro(ids, n, slots);
    else if ((t.settings.byeTo || 'top') === 'random') slotArr = placeRandomBye(ids, n, slots);
    else slotArr = placeStandard(ids, n, slots);

    const rounds = [];
    const nRounds = Math.log2(slots);
    for (let r = 0; r < nRounds; r++) {
      const parts = slots / Math.pow(2, r);
      const rd = { title: roundTitle(parts), matches: [] };
      for (let i = 0; i < parts / 2; i++) {
        if (r === 0) rd.matches.push(mkMatch(0, i, slotArr[i * 2], slotArr[i * 2 + 1]));
        else {
          const m = mkMatch(r, i, null, null);
          m.pa = 'r' + (r - 1) + 'm' + (i * 2); m.pb = 'r' + (r - 1) + 'm' + (i * 2 + 1);
          rd.matches.push(m);
        }
      }
      rounds.push(rd);
    }
    t.rounds = rounds;
    t.thirdPlace = (t.settings.thirdPlace && nRounds >= 2)
      ? Object.assign(mkMatch(99, 0, null, null), { id: 'third', title: 'رده‌بندی' }) : null;
    t.champion = null; t.status = 'ongoing';
    for (const m of rounds[0].matches) autoBye(t, m);
    Store.save();
    return true;
  }
  function autoBye(t, m) {
    if ((m.a === 'BYE') !== (m.b === 'BYE')) {
      const w = m.a === 'BYE' ? m.b : m.a;
      m.status = 'done';
      m.result = { type: 'bye', winner: w, loser: 'BYE', note: 'صعود با قرعه استراحت' };
      propagate(t, m);
    }
  }

  function matchWinner(t, m) { return (!m || m.status !== 'done' || !m.result) ? null : m.result.winner; }
  function matchLoser(t, m) { return (!m || m.status !== 'done' || !m.result) ? null : m.result.loser; }

  function propagate(t, m) {
    const w = matchWinner(t, m), l = matchLoser(t, m);
    if (!w || m.id === 'third') return;
    if (m.round === t.rounds.length - 1) { t.champion = w; t.status = 'done'; Store.save(); return; }
    const nx = nextSlot(m.round, m.index);
    const nm = findMatch(t, 'r' + nx.r + 'm' + nx.m);
    if (nm) nm[nx.slot] = w;
    if (m.round === t.rounds.length - 2 && t.thirdPlace && l && l !== 'BYE')
      t.thirdPlace[m.index === 0 ? 'a' : 'b'] = l;
    Store.save();
  }

  function clearDependents(t, m, ow, ol) {
    const w = ow || matchWinner(t, m), l = ol || matchLoser(t, m);
    if (!w && !l) return;
    if (m.id !== 'third') {
      if (m.round === t.rounds.length - 1) { t.champion = null; if (t.status === 'done') t.status = 'ongoing'; }
      else {
        const nx = nextSlot(m.round, m.index);
        const nm = findMatch(t, 'r' + nx.r + 'm' + nx.m);
        if (nm && nm[nx.slot] === w) {
          if (nm.status === 'done') { clearDependents(t, nm); clearSelf(nm); }
          nm[nx.slot] = null;
        }
      }
      if (m.round === t.rounds.length - 2 && t.thirdPlace && l) {
        const slot = m.index === 0 ? 'a' : 'b', tp = t.thirdPlace;
        if (tp[slot] === l) { if (tp.status === 'done') clearSelf(tp); tp[slot] = null; }
      }
    }
    Store.save();
  }
  function clearSelf(m) {
    m.status = 'scheduled'; m.result = null;
    m.scoreA = null; m.scoreB = null; m.etA = null; m.etB = null;
    m.penA = null; m.penB = null; m.games = []; m.scorers = [];
  }
  function clearResult(t, matchId) {
    const m = findMatch(t, matchId);
    if (!m || m.status !== 'done') return;
    clearDependents(t, m); clearSelf(m); Store.save();
  }

  const num = v => { const n = parseInt(v, 10); return isNaN(n) || n < 0 ? null : n; };

  /* برنده سری از روی بازی‌ها */
  function seriesScore(games, needed) {
    let wa = 0, wb = 0;
    for (const g of games) {
      if (g.a === null || g.b === null) continue;
      if (g.a === g.b) return { error: 'بازی سری نمی‌تواند مساوی باشد.' };
      if (g.a > g.b) wa++; else wb++;
    }
    if (wa >= needed) return { winner: 'a', wa, wb };
    if (wb >= needed) return { winner: 'b', wa, wb };
    return { error: 'نتیجه سری کامل نیست (برد ' + needed + ' بازی لازم است).' };
  }

  function setResult(t, matchId, d) {
    const m = findMatch(t, matchId);
    if (!m) return false;
    if (m.locked) { alert('این بازی قفل شده است.'); return false; }
    if (!m.a || !m.b || m.a === 'BYE' || m.b === 'BYE') { alert('هر دو تیم مشخص نیستند.'); return false; }
    const series = t.settings.series || 1;
    const nv = { scoreA: null, scoreB: null, etA: null, etB: null, penA: null, penB: null, games: [], seriesWins: null };
    let winner = null, loser = null;

    if (d.type === 'score') {
      if (series > 1) {
        const needed = seriesNeeded(series);
        const games = (d.games || []).map(g => ({ a: num(g.a), b: num(g.b) }));
        const r = seriesScore(games, needed);
        if (r.error) { alert(r.error); return false; }
        nv.games = games;
        nv.seriesWins = { a: r.wa, b: r.wb };
        winner = r.winner === 'a' ? m.a : m.b;
      } else if (t.settings.scoring === 'goals') {
        const a = num(d.scoreA), b = num(d.scoreB);
        if (a === null || b === null) { alert('نتیجه ۹۰ دقیقه را وارد کن.'); return false; }
        nv.scoreA = a; nv.scoreB = b;
        if (a !== b) winner = a > b ? m.a : m.b;
        else {
          const ea = d.etA === '' || d.etA === undefined ? null : num(d.etA);
          const eb = d.etB === '' || d.etB === undefined ? null : num(d.etB);
          if ((ea === null) !== (eb === null)) { alert('گل وقت اضافه هر دو تیم را وارد کن.'); return false; }
          nv.etA = ea; nv.etB = eb;
          const ta = a + (ea || 0), tb = b + (eb || 0);
          if (ta !== tb) winner = ta > tb ? m.a : m.b;
          else {
            const pa = num(d.penA), pb = num(d.penB);
            if (pa === null || pb === null) { alert('بازی مساوی است؛ نتیجه پنالتی لازم است.'); return false; }
            if (pa === pb) { alert('پنالتی نمی‌تواند مساوی باشد.'); return false; }
            nv.penA = pa; nv.penB = pb;
            winner = pa > pb ? m.a : m.b;
          }
        }
      } else {
        const a = num(d.scoreA), b = num(d.scoreB);
        if (a === null || b === null) { alert('نتیجه معتبر وارد کن.'); return false; }
        nv.scoreA = a; nv.scoreB = b;
        if (a === b) {
          const pa = num(d.penA), pb = num(d.penB);
          if (pa === null || pb === null) { alert('بازی مساوی است؛ نتیجه پنالتی لازم است.'); return false; }
          if (pa === pb) { alert('پنالتی نمی‌تواند مساوی باشد.'); return false; }
          nv.penA = pa; nv.penB = pb;
          winner = pa > pb ? m.a : m.b;
        } else winner = a > b ? m.a : m.b;
      }
      loser = winner === m.a ? m.b : m.a;
    } else {
      winner = d.winner;
      if (winner !== m.a && winner !== m.b) { alert('برنده نامعتبر است.'); return false; }
      loser = winner === m.a ? m.b : m.a;
    }
    // اگر نتیجه قبلی بود، اول اثراتش را از بازی‌های بعدی پاک کن
    if (m.status === 'done' && m.result) clearDependents(t, m, m.result.winner, m.result.loser);
    clearSelf(m);
    m.scoreA = nv.scoreA; m.scoreB = nv.scoreB; m.etA = nv.etA; m.etB = nv.etB;
    m.penA = nv.penA; m.penB = nv.penB; m.games = nv.games;
    if (nv.seriesWins) m.seriesWins = nv.seriesWins;
    m.status = 'done';
    m.result = { type: d.type, winner, loser, note: d.note || '' };
    m.cards = {
      ya: num(d.ya) || 0, yb: num(d.yb) || 0,
      ra: num(d.ra) || 0, rb: num(d.rb) || 0
    };
    m.mvp = normalizeMvp(d.mvp);
    m.scorers = normalizeScorers(d.scorers, m);
    if (d.photo !== undefined) m.photo = d.photo;
    if (d.date !== undefined) { m.date = d.date; m.time = d.time; m.place = d.place; m.ref = d.ref; }
    propagate(t, m);
    Store.save();
    return true;
  }

  function setSchedule(t, matchId, d) {
    const m = findMatch(t, matchId);
    if (!m) return;
    m.date = d.date; m.time = d.time; m.place = d.place; m.ref = d.ref;
    Store.save();
  }

  function resetBracket(t) {
    t.rounds = []; t.thirdPlace = null; t.champion = null; t.status = 'setup';
    Store.save();
  }

  function swapTeams(t, idA, idB) {
    if (!t.rounds.length) return false;
    const order = [];
    for (const m of t.rounds[0].matches) { order.push(m.a, m.b); }
    const ia = order.indexOf(idA), ib = order.indexOf(idB);
    if (ia < 0 || ib < 0) return false;
    [order[ia], order[ib]] = [order[ib], order[ia]];
    const slots = order.length, nRounds = Math.log2(slots), rounds = [];
    for (let r = 0; r < nRounds; r++) {
      const parts = slots / Math.pow(2, r);
      const rd = { title: roundTitle(parts), matches: [] };
      for (let i = 0; i < parts / 2; i++) {
        if (r === 0) rd.matches.push(mkMatch(0, i, order[i * 2], order[i * 2 + 1]));
        else {
          const m = mkMatch(r, i, null, null);
          m.pa = 'r' + (r - 1) + 'm' + (i * 2); m.pb = 'r' + (r - 1) + 'm' + (i * 2 + 1);
          rd.matches.push(m);
        }
      }
      rounds.push(rd);
    }
    t.rounds = rounds;
    t.thirdPlace = t.settings.thirdPlace && nRounds >= 2
      ? Object.assign(mkMatch(99, 0, null, null), { id: 'third', title: 'رده‌بندی' }) : null;
    t.champion = null; t.status = 'ongoing';
    for (const m of rounds[0].matches) autoBye(t, m);
    Store.save();
    return true;
  }

  function allMatches(t) {
    const out = [];
    t.rounds.forEach(rd => rd.matches.forEach(m => out.push({ roundTitle: rd.title, m })));
    if (t.thirdPlace) out.push({ roundTitle: 'رده‌بندی', m: t.thirdPlace });
    return out;
  }
  /* شماره بازی در کل جدول */
  function matchNumber(t, matchId) {
    const all = allMatches(t);
    const i = all.findIndex(x => x.m.id === matchId);
    return i < 0 ? null : i + 1;
  }

  /* مجموع گل شامل وقت اضافه */
  function totals(m) {
    if ((m.games || []).length) {
      let ga = 0, gb = 0;
      for (const g of m.games) { if (g.a !== null && g.b !== null) { ga += g.a; gb += g.b; } }
      return { a: ga, b: gb };
    }
    return { a: (m.scoreA || 0) + (m.etA || 0), b: (m.scoreB || 0) + (m.etB || 0) };
  }

  /* نمایش خلاصه نتیجه روی کارت: {a, b} */
  function displayScore(m) {
    if (!m || m.status !== 'done' || !m.result || m.result.type === 'bye') return { a: '', b: '' };
    if (m.result.type !== 'score') return { a: '✓', b: '' };
    if ((m.games || []).length && m.seriesWins) {
      const w = m.result.winner;
      return w === m.a ? { a: m.seriesWins.a, b: m.seriesWins.b } : { a: m.seriesWins.b, b: m.seriesWins.a };
    }
    const t_ = totals(m);
    return { a: t_.a, b: t_.b };
  }

  function fairPoints(teamId, m) {
    const c = m.cards || { ya: 0, yb: 0, ra: 0, rb: 0 };
    return teamId === m.a ? (c.ya || 0) + 3 * (c.ra || 0) : (c.yb || 0) + 3 * (c.rb || 0);
  }

  function record(t, teamId) {
    const r = { played: 0, won: 0, lost: 0, gf: 0, ga: 0, y: 0, r: 0, fair: 0 };
    for (const { m } of allMatches(t)) {
      if (m.status !== 'done' || !m.result || m.result.type === 'bye') continue;
      if (m.a !== teamId && m.b !== teamId) continue;
      r.played++;
      if (m.result.winner === teamId) r.won++; else r.lost++;
      const tt = totals(m);
      if (m.a === teamId) { r.gf += tt.a; r.ga += tt.b; }
      else { r.gf += tt.b; r.ga += tt.a; }
      const c = m.cards || {};
      const y = m.a === teamId ? (c.ya || 0) : (c.yb || 0);
      const rd = m.a === teamId ? (c.ra || 0) : (c.rb || 0);
      r.y += y; r.r += rd; r.fair += y + 3 * rd;
    }
    return r;
  }

  /* عمیق‌ترین راندی که تیم در آن بازی کرد */
  function exitRound(t, teamId) {
    if (t.champion === teamId) return 999;
    let best = -1;
    for (const { m } of allMatches(t)) {
      if (m.id === 'third') continue;
      if ((m.a === teamId || m.b === teamId) && m.round > best) best = m.round;
    }
    return best;
  }

  /* رتبه‌بندی نهایی استاندارد تک‌حذفی */
  function finalRank(t) {
    if (!t.rounds.length) return [];
    const last = t.rounds.length - 1;
    const rec = {};
    t.teams.forEach(tm => { rec[tm.id] = record(t, tm.id); });
    const score = id => {
      const r = rec[id];
      return { id, exit: exitRound(t, id), won: r.won, gd: r.gf - r.ga, gf: r.gf, fair: r.fair, rank: (t.teams.find(x => x.id === id) || {}).rank || 0 };
    };
    let arr = t.teams.map(tm => score(tm.id));
    const champ = t.champion;
    const final = t.rounds[last].matches[0];
    const runner = champ && final && final.result ? final.result.loser : null;
    let third = null, fourth = null;
    if (t.thirdPlace && t.thirdPlace.status === 'done' && t.thirdPlace.result) {
      third = t.thirdPlace.result.winner; fourth = t.thirdPlace.result.loser;
    } else if (last >= 1) {
      // بدون بازی رده‌بندی: بازنده‌های نیمه‌نهایی سوم مشترک
      const semis = t.rounds[last - 1].matches;
      const sLosers = semis.map(m => (m.result ? m.result.loser : null)).filter(x => x && x !== 'BYE');
      third = sLosers.length ? 'TIED_SEMI' : null;
    }
    const rest = arr.filter(x => x.id !== champ && x.id !== runner && x.id !== third && x.id !== fourth);
    rest.sort((a, b) => b.exit - a.exit || b.gd - a.gd || b.gf - a.gf || a.fair - b.fair || rankVal(a.rank) - rankVal(b.rank));
    const out = [];
    if (champ) out.push({ id: champ, title: 'قهرمان 🏆' });
    if (runner && runner !== 'BYE') out.push({ id: runner, title: 'نایب‌قهرمان 🥈' });
    if (third === 'TIED_SEMI') {
      const semis = t.rounds[last - 1].matches;
      semis.forEach(m => { if (m.result && m.result.loser && m.result.loser !== 'BYE') out.push({ id: m.result.loser, title: 'سوم مشترک 🥉' }); });
    } else {
      if (third && third !== 'BYE') out.push({ id: third, title: 'سوم 🥉' });
      if (fourth && fourth !== 'BYE') out.push({ id: fourth, title: 'چهارم' });
    }
    let lastExit = null, bucketTitle = '';
    rest.forEach(x => {
      if (x.exit !== lastExit) {
        lastExit = x.exit;
        const parts = (t.rounds[x.exit] ? t.rounds[x.exit].matches.length : 1) * 2;
        bucketTitle = sharedRankTitle(parts);
      }
      out.push({ id: x.id, title: bucketTitle });
    });
    return out;
  }

  /* بهترین بازیکن: سازگار با نسخه قدیمی (رشته متنی) و جدید (آبجکت رشته‌محور) */
  function normalizeMvp(v) {
    if (v && typeof v === 'object') {
      const stats = {};
      Object.keys(v.stats || {}).forEach(k => {
        const n = parseInt(v.stats[k], 10);
        stats[k] = isNaN(n) || n < 0 ? 0 : n;
      });
      return { name: String(v.name || '').trim(), team: v.team || null, stats };
    }
    return String(v || '').trim();
  }
  function mvpName(m) {
    if (!m || !m.mvp) return '';
    return typeof m.mvp === 'string' ? m.mvp : (m.mvp.name || '');
  }
  function mvpStatsLine(t, m) {
    if (!m || !m.mvp || typeof m.mvp !== 'object') return '';
    const meta = (typeof SPORTS_META !== 'undefined' && SPORTS_META[t.sport]) || null;
    const parts = [];
    Object.keys(m.mvp.stats || {}).forEach(k => {
      const v = m.mvp.stats[k];
      if (!v) return;
      const lbl = meta ? (meta.mvpStats.find(s => s.key === k) || {}).label || k : k;
      parts.push(lbl + ' ' + v);
    });
    return parts.join('، ');
  }

  /* بهترین‌های تورنمنت: تعداد MVP اول، بعد مجموع stat اصلی رشته */
  function tournamentMvp(t) {
    const meta = (typeof SPORTS_META !== 'undefined' && SPORTS_META[t.sport]) || null;
    const primary = meta ? meta.primary : null;
    const map = {};
    for (const { m } of allMatches(t)) {
      if (m.status !== 'done' || !mvpName(m)) continue;
      const nm = mvpName(m);
      if (!map[nm]) map[nm] = { name: nm, team: (m.mvp && m.mvp.team) || null, awards: 0, main: 0 };
      map[nm].awards++;
      if (primary && m.mvp && m.mvp.stats) map[nm].main += m.mvp.stats[primary] || 0;
      if (!map[nm].team && m.mvp && m.mvp.team) map[nm].team = m.mvp.team;
    }
    return Object.keys(map).map(k => map[k])
      .sort((a, b) => b.awards - a.awards || b.main - a.main)
      .slice(0, 10);
  }

  /* گلزن‌ها و پاسورها: [{name, team, goals, assists}] */
  function normalizeScorers(list, m) {
    if (!Array.isArray(list)) return (m && Array.isArray(m.scorers)) ? m.scorers : [];
    const out = [];
    for (const s of list) {
      const name = String((s && s.name) || '').trim();
      if (!name) continue;
      const team = (s.team === (m && m.a) || s.team === (m && m.b)) ? s.team : null;
      const g = parseInt(s.goals, 10), a = parseInt(s.assists, 10);
      out.push({ name, team, goals: isNaN(g) || g < 0 ? 0 : g, assists: isNaN(a) || a < 0 ? 0 : a });
    }
    return out;
  }
  /* جدول تجمیعی گلزنان و پاسورها: مرتب گل، بعد پاس گل */
  function scorersTable(t) {
    const map = {};
    for (const { m } of allMatches(t)) {
      if (m.status !== 'done' || !m.result || m.result.type !== 'score') continue;
      if (!Array.isArray(m.scorers)) continue;
      for (const s of m.scorers) {
        const key = s.name + '|' + (s.team || '');
        if (!map[key]) map[key] = { name: s.name, team: s.team, goals: 0, assists: 0, played: 0, _ids: {} };
        map[key].goals += s.goals || 0;
        map[key].assists += s.assists || 0;
        if (!map[key]._ids[m.id]) { map[key]._ids[m.id] = 1; map[key].played++; }
      }
    }
    return Object.keys(map).map(k => {
      const r = map[k]; delete r._ids; return r;
    }).sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name, 'fa'));
  }

  function todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function faDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso + 'T00:00:00').toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch (e) { return iso; }
  }
  const faNum = n => (n === null || n === undefined || n === '') ? '—' : Number(n).toLocaleString('fa-IR');

  return {
    nextPow2, roundTitle, generateBracket, findMatch, teamName,
    setResult, clearResult, setSchedule, resetBracket, swapTeams,
    allMatches, matchNumber, record, finalRank, fairPoints, totals, displayScore,
    matchWinner, mvpName, mvpStatsLine, tournamentMvp, scorersTable, todayISO, faDate, faNum
  };
})();
