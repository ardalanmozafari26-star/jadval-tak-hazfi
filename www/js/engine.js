/* موتور تک‌حذفی — کاملاً منطبق بر فصل دوم کتاب (جدول تک‌حذفی):
   - سیدگذاری کتابی با جمع جفت‌سیدها: ۵ (۴تایی) / ۹ (۸تایی) / ۱۷ (۱۶تایی) / ۳۳ (۳۲تایی) / ۶۵ (۶۴تایی)
   - ترتیب کتابی: ۴:[1,4,3,2] ، ۸:[1,8,5,4,3,6,7,2] ، ۱۶:[1,16,9,8,5,12,13,4,3,14,11,6,7,10,15,2]
   - استراحت (BYE): روش توان بالاتر (با نوشتن B) و روش توان کمتر/پیشرفته (بدون B)
   - محاسبات کتابی: دورها=توان مبنا، کل مسابقات=n-1، استراحت=مبنای بالاتر−n
   - سه روش چیدمان کتابی: قرعه‌کشی / سیدگذاری / ترکیبی + رپشاژ (شانس مجدد) */
const Engine = (() => {
  const nextPow2 = n => { let p = 2; while (p < n) p *= 2; return Math.min(p, 64); };
  const lowerPow2 = n => { let p = 2; while (p * 2 < n) p *= 2; return p >= n ? p / 2 : p; };
  const seriesNeeded = s => Math.ceil(s / 2);

  /* ---- محاسبات فصل دوم ---- */
  function baseFor(n) { return nextPow2(Math.max(2, n)); }
  function lowerFor(n) {
    const b = baseFor(n);
    if (b === n) return b;
    return b / 2;
  }
  function roundsCount(n) { return Math.log2(baseFor(n)); }
  function totalMatches(n) { return Math.max(0, n - 1); }
  function byeCount(n) { return baseFor(n) - n; }
  function firstRoundMatches(n) {
    const b = baseFor(n);
    if (b === n) return n / 2;
    return n - lowerFor(n); // روش توان کمتر: n − توان کمتر
  }
  function firstRoundTeams(n) { return firstRoundMatches(n) * 2; }
  function pairSum(base) { return base + 1; } // ۵/۹/۱۷/۳۳/۶۵
  function calcInfo(n) {
    const base = baseFor(n), lower = lowerFor(n);
    return {
      n, base, lower,
      rounds: Math.log2(base),
      total: totalMatches(n),
      byes: byeCount(n),
      firstMatches: firstRoundMatches(n),
      firstTeams: firstRoundTeams(n),
      drawnMatches: base / 2, // بازی روی کاغذ در دور اول (شامل استراحت)
      realFirst: n - lower,   // بازی واقعی روش توان کمتر
      sum: pairSum(base),
      isPow2: base === n
    };
  }

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

  /* ترتیب کتابی سیدگذاری (فصل دوم) — دقیقاً مطابق مثال‌های کتاب:
     ۴تایی: S1 بالا، S2 پایین، S4 پایین نیمه بالا، S3 بالای نیمه پایین + جمع ۵
     ۸تایی: [S1,S8,S5,S4,S3,S6,S7,S2] + جمع ۹
     ۱۶تایی: [1,16,9,8,5,12,13,4,3,14,11,6,7,10,15,2] + جمع ۱۷
     ۳۲تایی (استخراج از مثال ۲۰تایی کتاب):
       بالا: [1,32,16,17,9,24,8,25,5,28,12,21,13,20,4,29]
       پایین:[30,3,19,14,22,11,27,6,26,7,23,10,18,15,31,2] + جمع ۳۳ */
  const BOOK_ORDER = {
    4: [1, 4, 3, 2],
    8: [1, 8, 5, 4, 3, 6, 7, 2],
    16: [1, 16, 9, 8, 5, 12, 13, 4, 3, 14, 11, 6, 7, 10, 15, 2],
    32: [1, 32, 16, 17, 9, 24, 8, 25, 5, 28, 12, 21, 13, 20, 4, 29,
         30, 3, 19, 14, 22, 11, 27, 6, 26, 7, 23, 10, 18, 15, 31, 2],
    64: [1, 64, 32, 33, 16, 49, 17, 48, 9, 56, 24, 41, 8, 57, 25, 40,
         5, 60, 28, 37, 12, 53, 21, 44, 13, 52, 20, 45, 4, 61, 29, 36,
         35, 30, 62, 3, 46, 19, 51, 14, 43, 22, 54, 11, 38, 27, 59, 6,
         58, 7, 39, 26, 42, 23, 55, 10, 47, 18, 50, 15, 34, 31, 63, 2]
  };
  function seedOrder(n) {
    if (BOOK_ORDER[n]) return [...BOOK_ORDER[n]];
    // بازگشت برای مقادیر غیراستاندارد (نباید رخ دهد)
    let arr = [1];
    while (arr.length < n) {
      const size = arr.length * 2, next = [];
      for (const x of arr) { next.push(x); next.push(size + 1 - x); }
      arr = next;
    }
    return arr;
  }
  /* ترتیب کتابی برای هر مبنا — همان seedOrder ولی با نام کتابی */
  function textbookOrder(slots) { return seedOrder(slots); }
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
      paKind: 'w', pbKind: 'w', kind: 'wb',
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
    for (const rd of (t.rounds || [])) for (const m of rd.matches) if (m.id === id) return m;
    for (const rd of (t.lbRounds || [])) for (const m of rd.matches) if (m.id === id) return m;
    for (const rd of (t.asianRounds || [])) for (const m of rd.matches) if (m.id === id) return m;
    if (t.gf && t.gf.id === id) return t.gf;
    if (t.repechage) {
      for (const g of ['champ', 'runner']) {
        const br = t.repechage[g === 'champ' ? 'champBracket' : 'runnerBracket'];
        if (br && br.rounds) for (const rd of br.rounds) for (const m of rd.matches) if (m.id === id) return m;
      }
    }
    return null;
  }
  function teamName(t, id) {
    if (!id) return 'نامشخص';
    if (id === 'BYE') return 'استراحت';
    const tm = t.teams.find(x => x.id === id);
    return tm ? tm.name : 'حذف‌شده';
  }

  /* ترتیب سیدها بر اساس سه روش کتابی فصل دوم؛ قرارداد: ۱ قوی‌ترین (عدد کوچک‌تر = قوی‌تر)
     الف) قرعه‌کشی (lottery/random): بدون توجه به رتبه، کاملاً تصادفی
     ب) سیدگذاری (seeding/ranked): مرتب‌سازی بر اساس رتبه + چیدمان کتابی
     ج) ترکیبی (combined/pro): سیدهای ۱..k سر جای کتابی، بقیه به قید قرعه */
  function orderTeams(t, method, seededCount) {
    const arr = [...t.teams];
    const m = method || 'random';
    if (m === 'ranked' || m === 'seeding' || m === 'pro' || m === 'combined') {
      arr.sort((x, y) => rankVal(x.rank) - rankVal(y.rank));
    } else if (m === 'random' || m === 'lottery') {
      shuffle(arr);
    } else if (m === 'sequential' || m === 'manual') {
      // ترتیب دستی حفظ می‌شود (تیم‌ها از قبل مرتب‌اند)
    } else {
      shuffle(arr);
    }
    return arr;
  }

  /* چیدمان کتابی: سید S در جایگاه textbookOrder؛ سیدهای ناموجود → BYE (استراحت) */
  function placeStandard(ids, n, slots) {
    return placeTextbook(ids, n, slots);
  }
  function placeTextbook(ids, n, slots) {
    const seeds = textbookOrder(slots);
    return seeds.map(s => (s <= n ? ids[s - 1] : 'BYE'));
  }

  /* چیدمان حرفه‌ای تنیسی (سازگار با نسخه قبل): سید ۱ و ۲ سر جای کتابی، بقیه تصادفی */
  function placePro(ids, n, slots) {
    return placeCombined(ids, n, slots, Math.min(2, n));
  }

  /* چیدمان ترکیبی کتابی: k سید اول سر جای کتابی، بقیه قرعه در جایگاه‌های باقی‌مانده */
  function placeCombined(ids, n, slots, k) {
    const seeds = textbookOrder(slots);
    const out = new Array(slots).fill(null);
    const kk = Math.max(0, Math.min(k == null ? 4 : k, n));
    // جایگاه سیدهای ۱..k
    for (let s = 1; s <= kk; s++) {
      const pos = seeds.indexOf(s);
      if (pos >= 0) out[pos] = ids[s - 1];
    }
    // بقیه تیم‌ها (k+1..n) به قید قرعه در جایگاه‌های خالیِ دارای سید ≤ n
    const rest = shuffle(ids.slice(kk));
    const emptySeedPos = [];
    seeds.forEach((s, pos) => {
      if (s > kk && s <= n && out[pos] === null) emptySeedPos.push(pos);
    });
    // جایگاه‌های BYE (سید > n) هم BYE می‌مانند
    seeds.forEach((s, pos) => { if (s > n) out[pos] = 'BYE'; });
    emptySeedPos.forEach((pos, i) => { out[pos] = rest[i]; });
    return out;
  }

  /* چیدمان ترتیبی قدیمی (حفظ سازگاری): BYEها اول به سیدهای بالا، بعد ۱-۲، ۳-۴ ... */
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

  /* قرعه‌کشی کتابی: ترتیب تصادفی تیم‌ها، سپس قرارگیری بالا→پایین روی جدول خام.
     استراحت‌ها خودکار به قید قرعه می‌افتند (چون جایگاه‌ها تصادفی‌اند). */
  function placeLotteryTextbook(ids, n, slots) {
    const shuffled = shuffle([...ids]);
    const seeds = textbookOrder(slots);
    // جایگاه‌های سید ≤ n با تیم‌های قرعه پر می‌شود؛ جایگاه سید > n همان BYE
    const out = new Array(slots).fill(null);
    const it = [...shuffled];
    seeds.forEach((s, pos) => {
      if (s <= n) out[pos] = it.pop();
      else out[pos] = 'BYE';
    });
    return out;
  }
  function defaultSeeded(n) {
    if (n <= 4) return 2;
    if (n <= 8) return 4;
    return 8;
  }

  function normMethod(m) {
    if (m === 'ranked' || m === 'seeding') return 'seeding';
    if (m === 'random' || m === 'lottery') return 'lottery';
    if (m === 'pro' || m === 'combined') return 'combined';
    return m;
  }

  /* ================= جدول دو حذفی — فصل چهارم کتاب =================
     قاعده کتاب:
       • جدول برنده‌ها (WB) دقیقاً همانند جدول تک‌حذفی: همان سیدگذاری، همان استراحت‌گذاری، همان ادامهٔ مسابقات بین برندگان.
       • بازندگان به جدول بازنده‌ها (LB) منتقل می‌شوند و تا دو باخت ادامه می‌دهند.
       • بازندگان دور اول و دور آخر «مستقیم» وارد جدول بازنده‌ها می‌شوند؛
         بازندگان دور دوم به بعد «ضربدری» منتقل می‌شوند (ضربدری کوچک = دور دوم، ضربدری بزرگ = دور آخر).
       • برندهٔ جدول بازنده‌ها به فینال بزرگ (Grand Final) می‌رود و مجدداً با برندهٔ جدول برنده‌ها بازی می‌کند. */
  const DE_MAX = 64;

  /* اندازهٔ سطوح جدول بازنده‌ها: [2^(k-2),2^(k-2),2^(k-3),2^(k-3),...,1,1] */
  function deLbSizes(k) {
    const out = [];
    for (let j = 0; j < k - 1; j++) { const s = Math.pow(2, k - 2 - j); out.push(s, s); }
    return out;
  }
  function deLbTitle(j, k) {
    const lvl = faNum(j + 1);
    if (j === 0) return 'بازنده‌ها ' + lvl + ' • ورود مستقیم بازندگان دور اول';
    if (j % 2 === 1) {
      const isLast = j === deLbSizes(k).length - 1;
      return 'بازنده‌ها ' + lvl + ' • ضربدری' + (j === 1 ? ' کوچک' : ' بزرگ') + (isLast ? ' (فینال بازنده‌ها)' : '');
    }
    return 'بازنده‌ها ' + lvl + ' • برندگان سطح قبل';
  }
  function deAllMatches(t) {
    const out = [];
    (t.rounds || []).forEach(rd => rd.matches.forEach(m => out.push({ roundTitle: rd.title, m })));
    (t.lbRounds || []).forEach(rd => rd.matches.forEach(m => out.push({ roundTitle: rd.title, m })));
    if (t.gf) out.push({ roundTitle: 'فینال بزرگ', m: t.gf });
    return out;
  }
  function isDouble(t) { return !!t && t.format === 'double'; }

  /* ساخت جدول دو حذفی */
  function buildDouble(t, method, opts) {
    opts = opts || {};
    const m = normMethod(method || 'lottery');
    const ordered = orderTeams(t, m === 'seeding' || m === 'combined' ? 'seeding' : m);
    const n = ordered.length;
    if (n < 2) { alert('برای شروع، حداقل ۲ شرکت‌کننده لازم است 🌱'); return false; }
    if (n > DE_MAX) { alert('حداکثر ۶۴ شرکت‌کننده برای جدول دو حذفی.'); return false; }
    const slots = nextPow2(n);
    const k = Math.log2(slots);
    const ids = ordered.map(x => x.id);
    let slotArr;
    if (m === 'seeding') slotArr = placeTextbook(ids, n, slots);
    else if (m === 'combined') slotArr = placeCombined(ids, n, slots, opts.seededCount != null ? opts.seededCount : defaultSeeded(n));
    else if (m === 'sequential') slotArr = placeSequential(ids, n, slots);
    else if ((t.settings.byeTo || 'top') === 'random' && m === 'lottery') slotArr = placeRandomBye(ids, n, slots);
    else slotArr = placeLotteryTextbook(ids, n, slots);
    if (method === 'manual') slotArr = placeTextbook(ids, n, slots);
    const seeded = (m === 'combined') ? (opts.seededCount != null ? opts.seededCount : defaultSeeded(n)) : (m === 'seeding' ? n : 0);
    return assembleDouble(t, slotArr, m, seeded);
  }

  /* ساخت ساختار WB + LB + GF بر اساس ترتیب اسلات‌های دور اول */
  function assembleDouble(t, slotArr, m, seeded) {
    const n = t.teams.length;
    const slots = slotArr.length;
    const k = Math.log2(slots);

    /* --- ۱) جدول برنده‌ها (مثل تک‌حذفی) --- */
    const rounds = [];
    for (let r = 0; r < k; r++) {
      const parts = slots / Math.pow(2, r);
      const rd = { title: roundTitle(parts), matches: [], kind: 'wb' };
      for (let i = 0; i < parts / 2; i++) {
        if (r === 0) {
          const mm = mkMatch(0, i, slotArr[i * 2], slotArr[i * 2 + 1]);
          mm.id = 'wr0m' + i; mm.kind = 'wb';
          rd.matches.push(mm);
        } else {
          const mm = mkMatch(r, i, null, null);
          mm.id = 'wr' + r + 'm' + i; mm.kind = 'wb';
          mm.pa = 'wr' + (r - 1) + 'm' + (i * 2);
          mm.pb = 'wr' + (r - 1) + 'm' + (i * 2 + 1);
          rd.matches.push(mm);
        }
      }
      rounds.push(rd);
    }
    rounds.forEach(rd => rd.matches.forEach(mm => { mm.title = rd.title; }));

    /* --- ۲) جدول بازنده‌ها --- */
    const sizes = deLbSizes(k);
    const lbRounds = [];
    for (let j = 0; j < sizes.length; j++) {
      const size = sizes[j];
      const rd = { title: deLbTitle(j, k), matches: [], kind: 'lb', level: j };
      for (let i = 0; i < size; i++) {
        const mm = mkMatch(j, i, null, null);
        mm.id = 'lr' + j + 'm' + i; mm.kind = 'lb'; mm.lbLevel = j;
        if (j === 0) {
          // بازندگان دور اول جدول برنده‌ها — ورود مستقیم
          mm.pa = 'wr0m' + (i * 2); mm.paKind = 'l';
          mm.pb = 'wr0m' + (i * 2 + 1); mm.pbKind = 'l';
        } else if (j % 2 === 1) {
          // سطح ضربدری: برندهٔ سطح قبل + بازندهٔ دور متناظر جدول برنده‌ها (ضربدری)
          mm.pa = 'lr' + (j - 1) + 'm' + i; mm.paKind = 'w';
          const wbRound = Math.floor((j + 1) / 2);
          const wbCount = slots / Math.pow(2, wbRound + 1);
          const idx = (wbCount > 1) ? (i ^ 1) : 0;
          mm.pb = 'wr' + wbRound + 'm' + idx; mm.pbKind = 'l';
        } else {
          // سطح مستقیم: دو برندهٔ سطح قبل
          mm.pa = 'lr' + (j - 1) + 'm' + (i * 2); mm.paKind = 'w';
          mm.pb = 'lr' + (j - 1) + 'm' + (i * 2 + 1); mm.pbKind = 'w';
        }
        rd.matches.push(mm);
      }
      lbRounds.push(rd);
    }
    lbRounds.forEach(rd => rd.matches.forEach(mm => { mm.title = rd.title; }));

    /* --- ۳) فینال بزرگ --- */
    const gf = mkMatch(99, 0, null, null);
    gf.id = 'grandfinal'; gf.kind = 'gf'; gf.title = 'فینال بزرگ';
    gf.pa = 'wr' + (k - 1) + 'm0'; gf.paKind = 'w';
    if (sizes.length) { gf.pb = 'lr' + (sizes.length - 1) + 'm0'; gf.pbKind = 'w'; }
    else { gf.pb = 'wr' + (k - 1) + 'm0'; gf.pbKind = 'l'; }

    t.rounds = rounds;
    t.lbRounds = lbRounds;
    t.gf = gf;
    t.format = 'double';
    t.thirdPlace = null;
    t.drawMethod = m;
    t.drawSeeded = seeded || 0;
    t.calc = deCalcInfo(n, slots, k, sizes);
    t.calc.slots = slots;
    t.champion = null; t.status = 'ongoing'; t.repechage = null; t.celebrated = false;
    t.losses = {};

    // استراحت‌های دور اول خودکار
    rounds[0].matches.forEach(mm => autoBye(t, mm));
    deRefresh(t);
    Store.save();
    return true;
  }
  /* محاسبات فصل چهارم */
  function deCalcInfo(n, slots, k, sizes) {
    slots = slots || nextPow2(n);
    k = k || Math.log2(slots);
    return {
      n, base: slots, rounds: k, byes: slots - n,
      wbMatches: n - 1, lbMatches: n - 2, gfMatches: 1,
      total: 2 * n - 2, totalMax: 2 * n - 1,
      firstMatches: n - lowerPow2(n),
      lbLevels: sizes ? sizes.length : 2 * (k - 1),
      sum: slots + 1,
      isDouble: true
    };
  }

  /* استخراج شرکت‌کنندهٔ یک منبع (برنده یا بازندهٔ بازی مبدأ) */
  function deSource(t, id, kind) {
    const src = findMatch(t, id);
    if (!src || src.status !== 'done' || !src.result) return null;
    return kind === 'l' ? src.result.loser : src.result.winner;
  }
  /* به‌روزرسانی بازی‌های وابسته به یک بازی و صعود خودکار */
  function deRefresh(t) {
    const all = deAllMatches(t);
    for (let pass = 0; pass < 60; pass++) {
      let changed = false;
      // ۱) پر کردن شرکت‌کنندگان از منابع
      for (const { m } of all) {
        if (m.pa) { const v = deSource(t, m.pa, m.paKind); if (v && m.a !== v) { m.a = v; changed = true; } }
        if (m.pb) { const v = deSource(t, m.pb, m.pbKind); if (v && m.b !== v) { m.b = v; changed = true; } }
      }
        // ۲) استراحت خودکار در همهٔ سطوح
        for (const { m } of all) {
          if (m.pa || m.pb) {
            // اگر ورودی‌ها عوض شده و هر دو واقعی‌اند، پرچم/نتیجه bye قبلی را برگردان
            if (m.a && m.b && m.a !== 'BYE' && m.b !== 'BYE') {
              if (m.hidden) { m.hidden = false; changed = true; }
              if (m.status === 'done' && m.result && m.result.type === 'bye') {
                m.status = 'scheduled'; m.result = null; changed = true;
              }
            }
          }
          if (m.status === 'done') continue;
          const a = m.a, b = m.b;
          if (!a || !b) continue;
          const aBye = a === 'BYE', bBye = b === 'BYE';
          if (aBye && bBye) {
            m.status = 'done'; m.hidden = true;
            m.result = { type: 'bye', winner: 'BYE', loser: 'BYE', note: 'استراحت' };
            changed = true;
          } else if (aBye !== bBye) {
            const w = aBye ? b : a;
            m.status = 'done';
            m.result = { type: 'bye', winner: w, loser: 'BYE', note: 'صعود با قرعه استراحت (B)' };
            changed = true;
          }
        }
      if (!changed) break;
    }
    // ۳) قهرمان
    const gf = t.gf;
    if (gf && gf.status === 'done' && gf.result && gf.result.winner && gf.result.winner !== 'BYE') {
      t.champion = gf.result.winner;
      t.status = 'done';
    } else t.status = 'ongoing';
    // ۴) شمارش باخت‌ها و حذف‌شدگان
    t.losses = deLosses(t);
    t.eliminated = {};
    for (const tm of t.teams) if ((t.losses[tm.id] || 0) >= 2) t.eliminated[tm.id] = true;
    Store.save();
  }
  /* ثبت برد/باخت و اثر آن */
  function deOnDecide(t, m) {
    if (!m.result) return;
    deRefresh(t);
  }
  /* شمارش باخت‌ها */
  function deLosses(t) {
    const map = {};
    for (const { m } of deAllMatches(t)) {
      if (m.status !== 'done' || !m.result) continue;
      const l = m.result.loser;
      if (!l || l === 'BYE') continue;
      map[l] = (map[l] || 0) + 1;
    }
    return map;
  }
  /* پاک‌کردن آبشاری نتایج وابسته (ویرایش نتیجه در جدول دو حذفی) */
  function deClearDown(t, m) {
    const all = deAllMatches(t);
    const seen = {};
    const walk = src => {
      if (!src || seen[src.id]) return;
      seen[src.id] = true;
      for (const { m: d } of all) {
        if (d.pa !== src.id && d.pb !== src.id) continue;
        if (d.status === 'done') { walk(d); clearSelf(d); }
        d.hidden = false;
        if (d.pa === src.id) d.a = null;
        if (d.pb === src.id) d.b = null;
      }
    };
    walk(m);
  }

  function generateBracket(t, method, opts) {
    opts = opts || {};
    if (t.format === 'double') return buildDouble(t, method, opts);
    if (t.format === 'asian') return buildAsian(t, method, opts);
    if (t.format === 'round') return buildRoundRobin(t, method, opts);
    const m = normMethod(method || 'lottery');
    const ordered = orderTeams(t, m === 'combined' ? 'seeding' : (m === 'seeding' ? 'seeding' : m));
    const n = ordered.length;
    if (n < 2) { alert('برای شروع، حداقل ۲ تیم لازم است 🌱'); return false; }
    if (n > 64) { alert('حداکثر ۶۴ تیم.'); return false; }
    const slots = nextPow2(n);
    const ids = ordered.map(x => x.id);
    let slotArr;
    if (m === 'seeding') slotArr = placeTextbook(ids, n, slots);
    else if (m === 'combined') slotArr = placeCombined(ids, n, slots, opts.seededCount != null ? opts.seededCount : defaultSeeded(n));
    else if (m === 'sequential') slotArr = placeSequential(ids, n, slots);
    else if ((t.settings.byeTo || 'top') === 'random' && m === 'lottery') slotArr = placeRandomBye(ids, n, slots);
    else if (m === 'lottery') slotArr = placeLotteryTextbook(ids, n, slots);
    else slotArr = placeTextbook(ids, n, slots);
    // روش دستی: ترتیب manualOrder از قبل در t.teams اعمال شده → مثل سیدگذاری کتابی بچین
    if (method === 'manual') slotArr = placeTextbook(ids, n, slots);

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
    rounds.forEach(rd => rd.matches.forEach(mm => { mm.title = rd.title; }));
    t.rounds = rounds;
    t.drawMethod = m;
    t.drawSeeded = (m === 'combined') ? (opts.seededCount != null ? opts.seededCount : defaultSeeded(n)) : (m === 'seeding' ? n : 0);
    t.calc = calcInfo(n);
    t.calc.slots = slots;
    t.thirdPlace = (t.settings.thirdPlace && nRounds >= 2)
      ? Object.assign(mkMatch(99, 0, null, null), { id: 'third', title: 'رده‌بندی' }) : null;
    t.champion = null; t.status = 'ongoing'; t.repechage = null;
    t.celebrated = false; t.format = 'single'; t.lbRounds = []; t.gf = null;
    for (const mm of rounds[0].matches) autoBye(t, mm);
    Store.save();
    return true;
  }
  function autoBye(t, m) {
    if ((m.a === 'BYE') !== (m.b === 'BYE')) {
      const w = m.a === 'BYE' ? m.b : m.a;
      m.status = 'done';
      m.result = { type: 'bye', winner: w, loser: 'BYE', note: 'صعود با قرعه استراحت' };
      if (isDouble(t)) deOnDecide(t, m); else propagate(t, m);
    }
  }

  function matchWinner(t, m) { return (!m || m.status !== 'done' || !m.result) ? null : m.result.winner; }
  function matchLoser(t, m) { return (!m || m.status !== 'done' || !m.result) ? null : m.result.loser; }

  function propagate(t, m) {
    if (isRoundRobin(t)) { roundRefresh(t); Store.save(); return; }
    const w = matchWinner(t, m), l = matchLoser(t, m);
    if (!w || m.id === 'third') return;
    if (isDouble(t)) { deOnDecide(t, m); return; }
    if (isAsian(t) && m.asian) { asianResolve(t); Store.save(); return; }
    if (m.round === t.rounds.length - 1) { t.champion = w; t.status = 'done'; if (isAsian(t)) asianResolve(t); Store.save(); return; }
    const nx = nextSlot(m.round, m.index);
    const nm = findMatch(t, 'r' + nx.r + 'm' + nx.m);
    if (nm) nm[nx.slot] = w;
    if (m.round === t.rounds.length - 2 && t.thirdPlace && l && l !== 'BYE')
      t.thirdPlace[m.index === 0 ? 'a' : 'b'] = l;
    if (isAsian(t)) asianResolve(t);
    Store.save();
  }

  function clearDependents(t, m, ow, ol) {
    const w = ow || matchWinner(t, m), l = ol || matchLoser(t, m);
    if (!w && !l) return;
    if (isDouble(t)) { deClearDown(t, m); return; }
    if (isRoundRobin(t)) { roundRefresh(t); Store.save(); return; }
    if (isAsian(t) && m.asian) { asianClearChain(t, m); asianResolve(t); Store.save(); return; }
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
    if (isAsian(t)) asianResolve(t);
    Store.save();
  }

  function clearSelf(m) {
    m.status = 'scheduled'; m.result = null;
    m.hidden = false;
    m.scoreA = null; m.scoreB = null; m.etA = null; m.etB = null;
    m.penA = null; m.penB = null; m.games = []; m.scorers = [];
    m.seriesWins = null;
  }
  function clearResult(t, matchId) {
    const m = findMatch(t, matchId);
    if (!m || m.status !== 'done') return;
    clearDependents(t, m); clearSelf(m);
    if (isDouble(t)) deRefresh(t);
    if (isAsian(t)) asianResolve(t);
    if (isRoundRobin(t)) roundRefresh(t);
    Store.save();
  }

  const num = v => { const n = parseInt(v, 10); return isNaN(n) || n < 0 ? null : n; };

  /* برنده سری از روی بازی‌ها + اعتبارسنجی تعداد و ترتیب برد */
  function seriesScore(games, needed, series) {
    const total = series || (needed * 2 - 1);
    const played = games.filter(g => g.a !== null && g.b !== null);
    if (played.length > total) return { error: 'تعداد بازی‌ها بیشتر از سقف سری (' + total + ') است.' };
    let wa = 0, wb = 0;
    for (const g of played) {
      if (g.a === g.b) return { error: 'بازی سری نمی‌تواند مساوی باشد.' };
      if (g.a > g.b) wa++; else wb++;
      // بازی اضافه بعد از قطعی شدن سری
      if (wa === needed || wb === needed) {
        const idx = played.indexOf(g);
        if (idx < played.length - 1) return { error: 'سری زودتر تمام شده؛ بازی اضافه ثبت شده است.' };
        break;
      }
    }
    if (wa === needed) return { winner: 'a', wa, wb };
    if (wb === needed) return { winner: 'b', wa, wb };
    if (wa > needed || wb > needed) return { error: 'نتیجه سری نامعتبر است.' };
    return { error: 'نتیجه سری کامل نیست (برد ' + needed + ' بازی لازم است).' };
  }

  function repechageMatches(t) {
    const out = [];
    if (!t.repechage) return out;
    ['champBracket', 'runnerBracket'].forEach(k => {
      const br = t.repechage[k === 'champBracket' ? 'champ' : 'runner'];
      if (br && br.rounds) br.rounds.forEach(rd => rd.matches.forEach(m => out.push({ roundTitle: 'رپشاژ', m })));
    });
    if (t.repechage.playoff) out.push({ roundTitle: 'پل‌آف سوم', m: t.repechage.playoff });
    return out;
  }
  function isRepechageMatch(t, id) {
    if (!t.repechage) return false;
    if (t.repechage.playoff && t.repechage.playoff.id === id) return true;
    return ['champ', 'runner'].some(g => {
      const br = t.repechage[repKey(g)];
      if (!br || !br.rounds) return false;
      return br.rounds.some(rd => rd.matches.some(m => m.id === id));
    });
  }
  function setResult(t, matchId, d) {
    const m = findMatch(t, matchId);
    if (!m) return false;
    if (isRepechageMatch(t, matchId)) { alert('بازی شانس مجدد است؛ برنده را از جدول رپشاژ انتخاب کن 🥉'); return false; }
    if (m.locked) { alert('🔒 این بازی قفل است؛ اول قفلش را باز کن'); return false; }
    if (!m.a || !m.b || m.a === 'BYE' || m.b === 'BYE') { alert('صبر کن! هر دو تیم این بازی هنوز مشخص نشده‌اند ⏳'); return false; }
    const series = t.settings.series || 1;
    const nv = { scoreA: null, scoreB: null, etA: null, etB: null, penA: null, penB: null, games: [], seriesWins: null };
    let winner = null, loser = null, isDraw = false;

    if (d.type === 'score') {
      if (series > 1) {
        const needed = seriesNeeded(series);
        const games = (d.games || []).map(g => ({ a: num(g.a), b: num(g.b) }));
        const r = seriesScore(games, needed, series);
        if (r.error) { alert(r.error); return false; }
        nv.games = games;
        nv.seriesWins = { a: r.wa, b: r.wb };
        winner = r.winner === 'a' ? m.a : m.b;
      } else if (t.settings.scoring === 'goals') {
        const a = num(d.scoreA), b = num(d.scoreB);
        if (a === null || b === null) { alert('اول نتیجه ۹۰ دقیقه را بنویس ✍️'); return false; }
        nv.scoreA = a; nv.scoreB = b;
        if (a !== b) winner = a > b ? m.a : m.b;
        else if (isRoundRobin(t)) { isDraw = true; }   // در جدول دوره‌ای تساوی مجاز است
        else {
          const ea = d.etA === '' || d.etA === undefined ? null : num(d.etA);
          const eb = d.etB === '' || d.etB === undefined ? null : num(d.etB);
          if ((ea === null) !== (eb === null)) { alert('گل وقت اضافه هر دو تیم را وارد کن.'); return false; }
          nv.etA = ea; nv.etB = eb;
          const ta = a + (ea || 0), tb = b + (eb || 0);
          if (ta !== tb) winner = ta > tb ? m.a : m.b;
          else {
            const pa = num(d.penA), pb = num(d.penB);
            if (pa === null || pb === null) { alert('مساوی شد! قهرمان را با پنالتی مشخص کن 🥅'); return false; }
            if (pa === pb) { alert('پنالتی‌ها هم مساوی شدند؟! یکی را بیشتر بنویس 😄'); return false; }
            nv.penA = pa; nv.penB = pb;
            winner = pa > pb ? m.a : m.b;
          }
        }
      } else {
        const a = num(d.scoreA), b = num(d.scoreB);
        if (a === null || b === null) { alert('این نتیجه درست به نظر نمی‌رسد؛ دوباره بنویس ✍️'); return false; }
        nv.scoreA = a; nv.scoreB = b;
        if (a === b) {
          if (isRoundRobin(t)) { isDraw = true; }     // تساوی در جدول دوره‌ای
          else {
            const pa = num(d.penA), pb = num(d.penB);
            if (pa === null || pb === null) { alert('مساوی شد! قهرمان را با پنالتی مشخص کن 🥅'); return false; }
            if (pa === pb) { alert('پنالتی‌ها هم مساوی شدند؟! یکی را بیشتر بنویس 😄'); return false; }
            nv.penA = pa; nv.penB = pb;
            winner = pa > pb ? m.a : m.b;
          }
        } else winner = a > b ? m.a : m.b;
      }
      if (!isDraw) loser = winner === m.a ? m.b : m.a;
    } else {
      winner = d.winner;
      if (winner !== m.a && winner !== m.b) { alert('تیم صعودکننده را درست انتخاب کن 👀'); return false; }
      loser = winner === m.a ? m.b : m.a;
    }
    // اگر نتیجه قبلی بود، اول اثراتش را از بازی‌های بعدی پاک کن
    if (m.status === 'done' && m.result) clearDependents(t, m, m.result.winner, m.result.loser);
    clearSelf(m);
    m.scoreA = nv.scoreA; m.scoreB = nv.scoreB; m.etA = nv.etA; m.etB = nv.etB;
    m.penA = nv.penA; m.penB = nv.penB; m.games = nv.games;
    if (nv.seriesWins) m.seriesWins = nv.seriesWins;
    m.status = 'done';
    m.result = { type: isDraw ? 'draw' : d.type, winner, loser, note: d.note || '' };
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
    t.repechage = null; t.calc = null; t.drawMethod = null;
    t.lbRounds = []; t.gf = null; t.losses = null; t.eliminated = null;
    t.asianRounds = []; t.asianTree = null;
    Store.save();
  }

  function swapTeams(t, idA, idB) {
    if (!t.rounds.length) return false;
    if (isRoundRobin(t)) {
      // جدول دوره‌ای با ترتیب سید/قرعه از نو ساخته می‌شود؛ جابه‌جایی باید درون‌جا باشد
      for (const rd of t.rounds) for (const m of rd.matches) {
        if (m.a === idA) m.a = idB; else if (m.a === idB) m.a = idA;
        if (m.b === idA) m.b = idB; else if (m.b === idB) m.b = idA;
        if (m.status === 'done' && m.result && (m.a === idA || m.a === idB || m.b === idA || m.b === idB)) {
          if (m.result.winner !== m.a && m.result.winner !== m.b) clearSelf(m);
        }
      }
      roundRefresh(t);
      Store.save();
      return true;
    }
    const order = [];
    for (const m of t.rounds[0].matches) { order.push(m.a, m.b); }
    const ia = order.indexOf(idA), ib = order.indexOf(idB);
    if (ia < 0 || ib < 0) return false;
    [order[ia], order[ib]] = [order[ib], order[ia]];
    if (isDouble(t)) return assembleDouble(t, order, t.drawMethod || 'lottery', t.drawSeeded || 0);
    if (isAsian(t)) return assembleAsian(t, order, t.drawMethod || 'lottery', { seededCount: t.drawSeeded || 0 });
    if (isRoundRobin(t)) return buildRoundRobin(t, t.drawMethod || 'seeding', {});
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
    rounds.forEach(rd => rd.matches.forEach(mm => { mm.title = rd.title; }));
    t.rounds = rounds;
    t.thirdPlace = t.settings.thirdPlace && nRounds >= 2
      ? Object.assign(mkMatch(99, 0, null, null), { id: 'third', title: 'رده‌بندی' }) : null;
    t.champion = null; t.status = 'ongoing'; t.repechage = null; t.celebrated = false;
    t.calc = calcInfo(t.teams.length); t.calc.slots = slots;
    for (const m of rounds[0].matches) autoBye(t, m);
    Store.save();
    return true;
  }

  function allMatches(t, opts) {
    const out = [];
    const skipRep = opts && opts.skipRep;
    (t.rounds || []).forEach(rd => rd.matches.forEach(m => out.push({ roundTitle: rd.title, m })));
    if (isDouble(t)) {
      (t.lbRounds || []).forEach(rd => rd.matches.forEach(m => out.push({ roundTitle: rd.title, m })));
      if (t.gf) out.push({ roundTitle: 'فینال بزرگ', m: t.gf });
    }
    if (isAsian(t)) {
      (t.asianRounds || []).forEach(rd => rd.matches.forEach(m => out.push({ roundTitle: rd.title, m })));
    }
    // رپشاژ هم جزو بازی‌های تورنمنت است تا record/exitRound/championPath یکسان شوند
    if (!skipRep) repechageMatches(t).forEach(x => out.push(x));
    if (t.thirdPlace) out.push({ roundTitle: 'رده‌بندی', m: t.thirdPlace });
    return out;
  }
  /* شماره بازی در کل جدول */
  function matchNumber(t, matchId) {
    const all = visibleMatches(t);
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
    if (m.result.type === 'draw') { const t_ = totals(m); return { a: t_.a, b: t_.b }; }
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
    const r = { played: 0, won: 0, lost: 0, drawn: 0, gf: 0, ga: 0, y: 0, r: 0, fair: 0 };
    // allMatches رپشاژ را هم دارد؛ تکرار نکن
    const seen = {};
    const list = allMatches(t).filter(x => {
      if (seen[x.m.id]) return false;
      seen[x.m.id] = true;
      return true;
    });
    for (const { m } of list) {
      if (m.status !== 'done' || !m.result || m.result.type === 'bye') continue;
      if (m.a !== teamId && m.b !== teamId) continue;
      r.played++;
      if (m.result.type === 'draw') r.drawn++;
      else if (m.result.winner === teamId) r.won++; else r.lost++;
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

  /* عمیق‌ترین راندی که تیم در آن بازی کرد (بدون رده‌بندی و رپشاژ) */
  function exitRound(t, teamId) {
    if (t.champion === teamId) return 999;
    let best = -1;
    for (const { m } of allMatches(t, { skipRep: true })) {
      if (m.id === 'third') continue;
      if (isRepechageMatch(t, m.id)) continue;
      if ((m.a === teamId || m.b === teamId) && m.round > best) best = m.round;
    }
    return best;
  }

  /* رتبه‌بندی نهایی جدول دو حذفی */
  function deFinalRank(t) {
    const out = [];
    const gf = t.gf;
    const done = gf && gf.status === 'done' && gf.result;
    const champ = done ? gf.result.winner : null;
    const runner = done ? gf.result.loser : null;
    if (champ) out.push({ id: champ, title: 'قهرمان 🏆' });
    if (runner && runner !== 'BYE') out.push({ id: runner, title: 'نایب‌قهرمان 🥈' });
    const lb = t.lbRounds || [];
    const last = lb.length - 1;
    const lbLoser = j => (j >= 0 && lb[j] && lb[j].matches[0] && lb[j].matches[0].result) ? lb[j].matches[0].result.loser : null;
    const third = lbLoser(last), fourth = lbLoser(last - 1);
    if (third && third !== 'BYE') out.push({ id: third, title: 'سوم 🥉' });
    if (fourth && fourth !== 'BYE' && fourth !== third) out.push({ id: fourth, title: 'چهارم' });
    const used = {};
    [champ, runner, third, fourth].forEach(x => { if (x) used[x] = true; });
    const elim = {};
    for (const { m } of deAllMatches(t)) {
      if (m.status !== 'done' || !m.result) continue;
      const l = m.result.loser;
      if (!l || l === 'BYE' || l === champ) continue;
      // LB عمیق‌تر از WB است؛ GF بالاترین عمق
      const d = m.kind === 'gf' ? 999 : (m.lbLevel != null ? 100 + m.lbLevel : 10 + (m.round || 0));
      if (elim[l] == null || d > elim[l]) elim[l] = d;
    }
    const elimTitle = d => {
      if (d >= 999) return 'حذف در فینال بزرگ';
      if (d >= 100) return 'حذف در سطح ' + (d - 100 + 1) + ' جدول بازنده‌ها';
      return 'حذف در دور ' + (d - 10 + 1) + ' جدول برنده‌ها';
    };
    const rest = t.teams.filter(tm => !used[tm.id]);
    rest.sort((a, b) => (elim[b.id] != null ? elim[b.id] : -1) - (elim[a.id] != null ? elim[a.id] : -1));
    let lastD = null, title = '';
    for (const tm of rest) {
      const d = elim[tm.id];
      if (d == null) { if (!champ) out.push({ id: tm.id, title: 'در جریان' }); continue; }
      if (d !== lastD) { lastD = d; title = elimTitle(d); }
      out.push({ id: tm.id, title });
    }
    return out;
  }

  /* رتبه‌بندی نهایی استاندارد تک‌حذفی */
  /* ================= جدول آسیایی — فصل سوم کتاب =================
     قاعده کتاب:
       • چیدمان و استراحت‌گذاری دقیقاً همانند جدول تک‌حذفی است.
       • تیم‌ها با باخت از دور مسابقات خارج نمی‌شوند؛ مسابقات تا تعیین مقام کلیهٔ شرکت‌کنندگان ادامه می‌یابد.
       • بازندگان دور اول به «پشت جدول» می‌روند و برای نیمهٔ پایین مقام‌ها رقابت می‌کنند.
       • هر بازنده با هر باخت، شانس مقام‌های بالاتر را از دست می‌دهد و فقط برای بهترین مقام همان دور رقابت می‌کند.
       • ساختار رتبه‌بندی تودرتو است: یک گروه p تیمی برای رتبه‌های r0..r0+p−1
         → برندگان نیمهٔ بالا و بازندگان نیمهٔ پایینِ همان گروه.
         مثلاً: فینال → ۱ و ۲ • بازندگان نیمه‌نهایی → ۳ و ۴ • بازندگان یک‌چهارم → ۵ تا ۸ • … */
  const ASIAN_MAX = 11;
  const ASIAN_RANK_TITLES = ['قهرمان 🏆', 'نایب‌قهرمان 🥈', 'سوم 🥉', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم',
    'نهم', 'دهم', 'یازدهم', 'دوازدهم', 'سیزدهم', 'چهاردهم', 'پانزدهم', 'شانزدهم'];

  function isAsian(t) { return !!t && t.format === 'asian'; }

  /* تعداد کل بازی‌ها برای رتبه‌بندی کامل: T(p) = p/2 + 2·T(p/2) */
  function asianTotalMatches(slots) {
    const T = p => p <= 1 ? 0 : p / 2 + 2 * T(p / 2);
    return T(slots);
  }

  function asianCalcInfo(n) {
    const slots = nextPow2(Math.max(2, n));
    const k = Math.log2(slots);
    const total = asianTotalMatches(slots);
    return {
      n, base: slots, slots, rounds: k,
      byes: slots - n,
      firstMatches: slots / 2,
      front: slots / 2,
      back: slots / 2,
      total,
      // «بازی واقعی» را نمی‌شود با فرمول خطی حساب کرد — BYE آبشاری چند بازی bye می‌سازد.
      // نمایش واقعی باید از statsOverview(t).total گرفته شود.
      played: null,
      sum: pairSum(slots),
      isPow2: slots === n
    };
  }

  /* عنوان دورهای جدول آسیایی */
  function asianRoundTitle(kind, p, r0) {
    if (kind === 'place') return p <= 2
      ? ('مقام ' + faNum(r0) + ' و ' + faNum(r0 + 1))
      : ('مقام ' + faNum(r0) + ' تا ' + faNum(r0 + p - 1));
    if (kind === 'back') return 'پشت جدول • ' + (p <= 2
      ? ('مقام ' + faNum(r0) + ' و ' + faNum(r0 + 1))
      : ('مقام ' + faNum(r0) + ' تا ' + faNum(r0 + p - 1)));
    return roundTitle(p);
  }

  /* ساخت جدول آسیایی */
  function buildAsian(t, method, opts) {
    opts = opts || {};
    const m = normMethod(method || 'lottery');
    const ordered = orderTeams(t, m === 'seeding' || m === 'combined' ? 'seeding' : m);
    const n = ordered.length;
    if (n < 2) { alert('برای شروع، حداقل ۲ شرکت‌کننده لازم است 🌱'); return false; }
    if (n > ASIAN_MAX) { alert('جدول آسیایی معمولاً برای حداکثر ۱۱ شرکت‌کننده به کار می‌رود.'); return false; }
    const slots = nextPow2(n);
    const ids = ordered.map(x => x.id);
    let slotArr;
    if (m === 'seeding') slotArr = placeTextbook(ids, n, slots);
    else if (m === 'combined') slotArr = placeCombined(ids, n, slots, opts.seededCount != null ? opts.seededCount : defaultSeeded(n));
    else if (m === 'sequential') slotArr = placeSequential(ids, n, slots);
    else if ((t.settings.byeTo || 'top') === 'random' && m === 'lottery') slotArr = placeRandomBye(ids, n, slots);
    else if (m === 'lottery') slotArr = placeLotteryTextbook(ids, n, slots);
    else slotArr = placeTextbook(ids, n, slots);
    if (method === 'manual') slotArr = placeTextbook(ids, n, slots);
    return assembleAsian(t, slotArr, m, opts);
  }

  /* ساخت ساختار کامل: جدول جلو (دقیقاً مثل تک‌حذفی) + گروه‌های رتبه‌بندی + پشت جدول */
  function assembleAsian(t, slotArr, m, opts) {
    opts = opts || {};
    const n = t.teams.length;
    const slots = slotArr.length;
    const k = Math.log2(slots);

    /* ---- جدول جلو: همان جدول تک‌حذفی ---- */
    const rounds = [];
    for (let r = 0; r < k; r++) {
      const parts = slots / Math.pow(2, r);
      const rd = { title: roundTitle(parts), kind: 'wb', matches: [] };
      for (let i = 0; i < parts / 2; i++) {
        if (r === 0) rd.matches.push(mkMatch(0, i, slotArr[i * 2], slotArr[i * 2 + 1]));
        else {
          const mm = mkMatch(r, i, null, null);
          mm.pa = 'r' + (r - 1) + 'm' + (i * 2); mm.pb = 'r' + (r - 1) + 'm' + (i * 2 + 1);
          rd.matches.push(mm);
        }
      }
      rounds.push(rd);
    }
    rounds.forEach(rd => rd.matches.forEach(mm => { mm.title = rd.title; }));
    t.rounds = rounds;

    /* ---- گروه رتبه‌بندی: p منبع برای رتبه‌های r0..r0+p−1 ---- */
    const extra = [];
    let xn = 0;
    function buildGroup(sources, r0, kind) {
      const p = sources.length;
      if (p < 2) return { p, r0, m: [], w: null, l: null };
      const half = p / 2;
      const rd = { title: asianRoundTitle(kind, p, r0), kind, matches: [] };
      const ids = [];
      for (let i = 0; i < half; i++) {
        const mm = mkMatch(100 + extra.length, i, null, null);
        mm.id = 'x' + (xn++) + 'm' + i;
        mm.kind = kind; mm.asian = true;
        mm.srcA = sources[i * 2]; mm.srcB = sources[i * 2 + 1];
        mm.title = rd.title;
        rd.matches.push(mm); ids.push(mm.id);
      }
      extra.push(rd);
      const w = buildGroup(ids.map(id => ({ k: 'w', id })), r0, kind);
      const l = buildGroup(ids.map(id => ({ k: 'l', id })), r0 + half, kind);
      return { p, r0, m: ids, w, l };
    }

    /* ---- درخت رتبه‌بندی ---- */
    const nodes = rounds.map((rd, r) => ({
      p: slots / Math.pow(2, r), r0: 1, m: rd.matches.map(x => x.id), w: null, l: null
    }));
    for (let r = 0; r < k - 1; r++) nodes[r].w = nodes[r + 1];
    /* فینال: برنده = رتبه ۱ ، بازنده = رتبه ۲ */
    nodes[k - 1].w = { p: 1, r0: 1, m: [], w: null, l: null };
    nodes[k - 1].l = { p: 1, r0: 2, m: [], w: null, l: null };
    /* بازندگان هر دور جدول جلو → گروه رتبه‌بندی همان سطح (۳و۴، ۵تا۸، ۹تا۱۶، …) */
    for (let r = k - 2; r >= 1; r--) {
      const cnt = slots / Math.pow(2, r + 1);
      const srcs = rounds[r].matches.map(mm => ({ k: 'l', id: mm.id }));
      nodes[r].l = buildGroup(srcs, cnt + 1, 'place');
    }
    /* بازندگان دور اول → پشت جدول (نیمهٔ پایین مقام‌ها) */
    nodes[0].l = buildGroup(rounds[0].matches.map(mm => ({ k: 'l', id: mm.id })), slots / 2 + 1, 'back');

    t.asianRounds = extra;
    t.asianTree = nodes[0];
    t.drawMethod = m;
    t.drawSeeded = (m === 'combined') ? (opts.seededCount != null ? opts.seededCount : defaultSeeded(n)) : (m === 'seeding' ? n : 0);
    t.calc = asianCalcInfo(n);
    t.calc.slots = slots;
    t.thirdPlace = null;
    t.champion = null; t.status = 'ongoing'; t.repechage = null;
    t.celebrated = false; t.format = 'asian'; t.lbRounds = []; t.gf = null;
    for (const mm of rounds[0].matches) autoBye(t, mm);
    asianResolve(t);
    Store.save();
    return true;
  }

  /* منبع شرکت‌کننده در جدول آسیایی: {k:'t'|'w'|'l', id} */
  function asianSrcRef(t, ref) {
    if (!ref) return null;
    if (ref.k === 't') return ref.id;
    if (ref.k === 'bye') return 'BYE';
    const src = findMatch(t, ref.id);
    if (!src || src.status !== 'done' || !src.result) return null;
    if (ref.k === 'w') return src.result.winner;
    const l = src.result.loser;
    return (l && l !== 'BYE') ? l : 'BYE';
  }

  /* به‌روزرسانی شرکت‌کنندگان دورهای رتبه‌بندی و پشت جدول + پاک‌سازی بازی‌هایی که ورودی‌شان تغییر کرده */
  function asianResolve(t) {
    const rounds = t.asianRounds || [];
    // چند پاس تا پایداری: سطح دوم به ورودی‌ای وابسته است که در همین فراخوانی پر شده
    for (let pass = 0; pass < 20; pass++) {
      let changed = false;
      for (const rd of rounds) {
        for (const m of rd.matches) {
          const a = asianSrcRef(t, m.srcA), b = asianSrcRef(t, m.srcB);
          const na = a || null, nb = b || null;
          if ((m.a || null) !== na || (m.b || null) !== nb) {
            m.a = na; m.b = nb;
            if (m.status === 'done') clearSelf(m);
            changed = true;
          }
          if (m.status !== 'done' && m.a && m.b && (m.a === 'BYE' || m.b === 'BYE')) {
            const w = (m.a === 'BYE') ? m.b : m.a;
            m.status = 'done';
            m.result = { type: 'bye', winner: w, loser: 'BYE', note: 'صعود با قرعه استراحت' };
            changed = true;
          }
        }
      }
      if (!changed) break;
    }
  }

  /* پاک‌سازی زنجیره‌ای بازی‌های رتبه‌بندی/پشت جدول */
  function asianClearChain(t, m) {
    clearSelf(m);
    for (const rd of (t.asianRounds || [])) {
      for (const nm of rd.matches) {
        if (nm === m) continue;
        if ((nm.srcA && nm.srcA.id === m.id) || (nm.srcB && nm.srcB.id === m.id)) {
          if (nm.status === 'done') asianClearChain(t, nm);
          clearSelf(nm);
          nm.a = null; nm.b = null;
        }
      }
    }
  }

  function asianAllMatches(t) {
    const out = [];
    (t.rounds || []).forEach(rd => rd.matches.forEach(m => out.push({ roundTitle: rd.title, m })));
    (t.asianRounds || []).forEach(rd => rd.matches.forEach(m => out.push({ roundTitle: rd.title, m })));
    return out;
  }

  /* رتبه‌بندی نهایی جدول آسیایی: از درخت رتبه (تودرتو) استخراج می‌شود */
  function asianRankList(t) {
    const out = [];
    const tree = t.asianTree;
    if (!tree) return out;
    (function walk(node) {
      if (!node || node.p < 2 || !node.m.length) return;
      const m0 = findMatch(t, node.m[0]);
      const w = node.w, l = node.l;
      if (w && w.p === 1) { const id = matchWinner(t, m0); if (id && id !== 'BYE') out.push({ id, rank: w.r0 }); }
      else if (w) walk(w);
      if (l && l.p === 1) { const id = matchLoser(t, m0); if (id && id !== 'BYE') out.push({ id, rank: l.r0 }); }
      else if (l) walk(l);
    })(tree);
    out.sort((a, b) => a.rank - b.rank);
    return out;
  }

  function asianFinalRank(t) {
    return asianRankList(t).map(it => ({
      id: it.id,
      title: ASIAN_RANK_TITLES[it.rank - 1] || (faNum(it.rank) + 'م')
    }));
  }

  /* ================= پایان جدول آسیایی ================= */

  /* ================= جدول دوره‌ای — فصل پنجم کتاب =================
     قاعده کتاب:
       • همهٔ شرکت‌کنندگان در یک گروه با هم بازی می‌کنند؛ هیچ‌کس با یک باخت حذف نمی‌شود.
       • برخلاف جداول حذفی، نتیجه می‌تواند مساوی باشد؛ امتیاز برد/باخت/تساوی در هر رشته
         متفاوت است و مقام با جمع امتیازات و سپس تفاضل نتایج مشخص می‌شود.
       • رسم دور بازی‌ها: شرکت‌کنندگان به ترتیب سید یا قرعه در یک ستون نوشته می‌شوند؛
         در دور اول نصف آنها روبه‌روی نصف دیگر قرار می‌گیرند (جفت‌های قرینه) و در هر دور
         بعد «۱» ثابت می‌ماند و بقیه یک دنده مخالف عقربهٔ ساعت جابه‌جا می‌شوند.
       • اگر تعداد شرکت‌کنندگان فرد باشد، حرف B به انتهای ستون اضافه می‌شود (استراحت).
     محاسبات: هر تیم (n−1) بازی • کل بازی‌ها = n(n−1)/2 • دورها = n−1 (زوج) یا n (فرد). */
  const RR_MAX = 32;
  const RR_ORDINALS = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم',
    'یازدهم', 'دوازدهم', 'سیزدهم', 'چهاردهم', 'پانزدهم', 'شانزدهم', 'هفدهم', 'هجدهم', 'نوزدهم', 'بیستم'];

  function isRoundRobin(t) { return !!t && t.format === 'round'; }

  function roundCalcInfo(n) {
    const odd = n % 2 === 1;
    return {
      n, odd,
      rounds: odd ? n : n - 1,
      perRound: Math.floor(n / 2),
      perTeam: n - 1,
      total: Math.floor(n * (n - 1) / 2),
      base: odd ? n + 1 : n
    };
  }

  /* جفت‌های قرینهٔ یک ستون (روش کتابی) */
  function roundRobinPairs(col) {
    const n = col.length, half = n / 2, out = [];
    for (let i = 0; i < half; i++) out.push([col[i], col[n - 1 - i]]);
    return out;
  }
  /* چرخش: اولی ثابت، بقیه یک دنده مخالف عقربهٔ ساعت */
  function roundRobinRotate(col) {
    return [col[0], col[col.length - 1]].concat(col.slice(1, col.length - 1));
  }

  /* ساخت جدول دوره‌ای */
  function buildRoundRobin(t, method, opts) {
    opts = opts || {};
    const m = normMethod(method || 'lottery');
    const ordered = orderTeams(t, m === 'seeding' || m === 'combined' ? 'seeding' : m);
    const n = ordered.length;
    if (n < 2) { alert('برای شروع، حداقل ۲ شرکت‌کننده لازم است 🌱'); return false; }
    if (n > RR_MAX) { alert('برای جدول دوره‌ای حداکثر ۳۲ شرکت‌کننده در نظر گرفته شده است.'); return false; }
    const odd = n % 2 === 1;
    let col = ordered.map(x => x.id);
    if (odd) col = col.concat(['BYE']);   // استراحت در انتهای ستون (حرف B کتاب)
    const rounds = [];
    const total = odd ? n : n - 1;
    for (let r = 0; r < total; r++) {
      const rd = { title: 'دور ' + faNum(r + 1), kind: 'rr', matches: [] };
      roundRobinPairs(col).forEach((p, i) => {
        const mm = mkMatch(r, i, null, null);
        mm.id = 'r' + r + 'm' + i;
        mm.a = p[0]; mm.b = p[1];
        mm.title = rd.title;
        rd.matches.push(mm);
      });
      rounds.push(rd);
      col = roundRobinRotate(col);
    }
    t.rounds = rounds;
    t.thirdPlace = null; t.champion = null; t.status = 'ongoing'; t.repechage = null;
    t.celebrated = false; t.format = 'round'; t.lbRounds = []; t.gf = null;
    t.asianRounds = []; t.asianTree = null;
    t.drawMethod = m;
    t.drawSeeded = 0;
    t.calc = roundCalcInfo(n);
    for (const rd of rounds) for (const mm of rd.matches) autoBye(t, mm);
    roundRefresh(t);
    Store.save();
    return true;
  }

  /* جدول ثبت نتایج گروه (فصل پنجم) */
  function leagueTable(t) {
    const P = (t.settings && t.settings.points) || { win: 3, draw: 1, loss: 0 };
    const rows = t.teams.map(tm => ({
      id: tm.id, name: tm.name, tm,
      played: 0, won: 0, lost: 0, drawn: 0, gf: 0, ga: 0, gd: 0, pts: 0, rank: 0
    }));
    const byId = {};
    rows.forEach(r => { byId[r.id] = r; });
    for (const { m } of allMatches(t)) {
      if (m.status !== 'done' || !m.result || m.result.type === 'bye') continue;
      if (!m.a || !m.b || m.a === 'BYE' || m.b === 'BYE') continue;
      const A = byId[m.a], B = byId[m.b];
      if (!A || !B) continue;
      const tt = totals(m);
      A.played++; B.played++;
      A.gf += tt.a; A.ga += tt.b; B.gf += tt.b; B.ga += tt.a;
      if (tt.a > tt.b) { A.won++; B.lost++; A.pts += (P.win || 0); B.pts += (P.loss || 0); }
      else if (tt.b > tt.a) { B.won++; A.lost++; B.pts += (P.win || 0); A.pts += (P.loss || 0); }
      else { A.drawn++; B.drawn++; A.pts += (P.draw || 0); B.pts += (P.draw || 0); }
    }
    rows.forEach(r => { r.gd = r.gf - r.ga; });
    // تای‌بریک: امتیاز ← تفاضل ← زده ← برد بیشتر ← بازی جوانمردانه کمتر ← الفبا
    const fairOf = r => (r.y || 0) + 3 * (r.r || 0);
    rows.forEach(r => { r.fair = fairOf(r); });
    rows.sort((x, y) => (y.pts - x.pts) || (y.gd - x.gd) || (y.gf - x.gf) || (y.won - x.won) || (fairOf(x) - fairOf(y)) || String(x.name).localeCompare(String(y.name), 'fa'));
    rows.forEach((r, i) => { r.rank = i + 1; });
    return rows;
  }

  /* به‌روزرسانی وضعیت و قهرمان جدول دوره‌ای */
  function roundRefresh(t) {
    const all = allMatches(t);
    const done = all.length > 0 && all.every(x => x.m.status === 'done');
    if (done) {
      const tbl = leagueTable(t);
      t.champion = tbl.length ? tbl[0].id : null;
      t.status = 'done';
    } else {
      if (t.champion) { t.champion = null; t.celebrated = false; }
      if (t.status === 'done') t.status = 'ongoing';
    }
  }

  /* رتبه‌بندی نهایی جدول دوره‌ای = ترتیب جدول ثبت نتایج */
  function roundFinalRank(t) {
    return leagueTable(t).map(r => ({
      id: r.id,
      title: r.rank === 1 ? 'قهرمان گروه 🏆' : (RR_ORDINALS[r.rank - 1] ? (RR_ORDINALS[r.rank - 1] + 'م') : faNum(r.rank) + 'م')
    }));
  }

  /* ---------- آمار اختصاصی دوره‌ای (فصل ۵، لیگ) ---------- */
  /* بازی واقعی لیگ: hidden و BYE و bye نادیده گرفته می‌شود */
  function rrCount(m) {
    if (!m || m.hidden) return false;
    if (m.a === 'BYE' || m.b === 'BYE') return false;
    if (m.result && m.result.type === 'bye') return false;
    return true;
  }
  function rrOverview(t) {
    const all = (t.rounds || []).reduce((n, rd) => n + rd.matches.filter(rrCount).length, 0);
    const done = (t.rounds || []).reduce((n, rd) => n + rd.matches.filter(m => rrCount(m) && m.status === 'done' && m.result).length, 0);
    const tbl = leagueTable(t);
    const draws = tbl.reduce((n, r) => n + (r.drawn || 0), 0) / 2;
    let goals = 0;
    for (const { m } of allMatches(t)) {
      if (!rrCount(m) || m.status !== 'done' || !m.result || m.result.type !== 'score') continue;
      const tt = totals(m);
      goals += (Number(tt.a) || 0) + (Number(tt.b) || 0);
    }
    const P = (t.settings && t.settings.points) || { win: 3, draw: 1, loss: 0 };
    return { total: all, done, left: Math.max(0, all - done), draws: Math.round(draws), goals,
      avg: done ? goals / done : 0, points: P, rounds: (t.rounds || []).length };
  }
  /* فرم ۵ بازی اخیر هر تیم: W/D/L از جدید به قدیم (شامل مساوی) */
  function rrForm(t, teamId) {
    const out = [];
    for (const { m } of allMatches(t)) {
      if (!rrCount(m) || m.status !== 'done' || !m.result) continue;
      if (m.result.type !== 'score' && m.result.type !== 'draw') continue;
      if (m.a !== teamId && m.b !== teamId) continue;
      out.push({ m, w: m.result.winner === teamId, d: m.result.type === 'draw' });
    }
    return out.slice(-5);
  }
  /* خلاصه تهاجمی/تدافعی لیگ */
  function rrAttackDefence(t) {
    const tbl = leagueTable(t);
    if (!tbl.length) return { attack: null, defence: null };
    let attack = tbl[0], defence = tbl[0];
    tbl.forEach(r => {
      if ((r.gf || 0) > (attack.gf || 0) || ((r.gf || 0) === (attack.gf || 0) && (r.played || 0) < (attack.played || 0))) attack = r;
      if ((r.ga || 0) < (defence.ga || 0) || ((r.ga || 0) === (defence.ga || 0) && (r.played || 0) > (defence.played || 0))) defence = r;
    });
    return { attack, defence };
  }
  /* صدرنشین هفته‌به‌هفته: بعد از هر دور، با همان منطق leagueTable ولی فقط تا آن دور */
  function rrLeaderByRound(t) {
    const P = (t.settings && t.settings.points) || { win: 3, draw: 1, loss: 0 };
    const out = [];
    const rounds = t.rounds || [];
    for (let upto = 0; upto < rounds.length; upto++) {
      const agg = {};
      t.teams.forEach(tm => { agg[tm.id] = { id: tm.id, name: tm.name, pts: 0, gd: 0, gf: 0, played: 0 }; });
      for (let r = 0; r <= upto; r++) {
        for (const m of (rounds[r].matches || [])) {
          if (!rrCount(m) || m.status !== 'done' || !m.result || m.result.type !== 'score') continue;
          if (!agg[m.a] || !agg[m.b]) continue;
          const tt = totals(m);
          agg[m.a].played++; agg[m.b].played++;
          agg[m.a].gf += tt.a; agg[m.b].gf += tt.b;
          agg[m.a].gd += tt.a - tt.b; agg[m.b].gd += tt.b - tt.a;
          if (tt.a > tt.b) { agg[m.a].pts += (P.win || 0); agg[m.b].pts += (P.loss || 0); }
          else if (tt.b > tt.a) { agg[m.b].pts += (P.win || 0); agg[m.a].pts += (P.loss || 0); }
          else { agg[m.a].pts += (P.draw || 0); agg[m.b].pts += (P.draw || 0); }
        }
      }
      const arr = Object.keys(agg).map(k => agg[k]).filter(x => x.played > 0);
      arr.sort((x, y) => (y.pts - x.pts) || (y.gd - x.gd) || (y.gf - x.gf) || String(x.name).localeCompare(String(y.name), 'fa'));
      out.push({ round: upto, title: rounds[upto].title, leader: arr.length ? arr[0] : null, played: arr.reduce((n, x) => n + x.played, 0) / 2 });
    }
    return out;
  }

  /* ================= پایان جدول دوره‌ای ================= */

  function finalRank(t) {
    if (!t.rounds.length) return [];
    if (isDouble(t)) return deFinalRank(t);
    if (isAsian(t)) return asianFinalRank(t);
    if (isRoundRobin(t)) return roundFinalRank(t);
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
    let semiLosers = [];
    const repThird = (t.repechage && t.repechage.third) ? t.repechage.third : null;
    const repFourth = (t.repechage && t.repechage.fourth) ? t.repechage.fourth : null;
    if (repThird && repThird.length) {
      third = 'TIED_REP';
    } else if (t.thirdPlace && t.thirdPlace.status === 'done' && t.thirdPlace.result) {
      third = t.thirdPlace.result.winner; fourth = t.thirdPlace.result.loser;
    } else if (last >= 1) {
      // بدون بازی رده‌بندی: بازنده‌های نیمه‌نهایی سوم مشترک
      const semis = t.rounds[last - 1].matches;
      semiLosers = semis.map(m => (m.result ? m.result.loser : null)).filter(x => x && x !== 'BYE');
      third = semiLosers.length ? 'TIED_SEMI' : null;
    }
    const rest = arr.filter(x => x.id !== champ && x.id !== runner && x.id !== third && x.id !== fourth
      && !semiLosers.includes(x.id)
      && !(third === 'TIED_REP' && repThird.includes(x.id))
      && !(repFourth && x.id === repFourth));
    rest.sort((a, b) => b.exit - a.exit || b.gd - a.gd || b.gf - a.gf || a.fair - b.fair || rankVal(a.rank) - rankVal(b.rank));
    const out = [];
    if (champ) out.push({ id: champ, title: 'قهرمان 🏆' });
    if (runner && runner !== 'BYE') out.push({ id: runner, title: 'نایب‌قهرمان 🥈' });
    if (third === 'TIED_REP') {
      // پل‌آف سوم برگزار شده → سوم و چهارم مشخص؛ در غیر این صورت سوم مشترک
      if (repFourth) {
        repThird.forEach(id => out.push({ id, title: 'سوم 🥉' }));
        out.push({ id: repFourth, title: 'چهارم' });
      } else {
        repThird.forEach(id => out.push({ id, title: 'سوم مشترک 🥉' }));
      }
    } else if (third === 'TIED_SEMI') {
      semiLosers.forEach(id => out.push({ id, title: 'سوم مشترک 🥉' }));
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

  /* ---------- آمار اختصاصی تک‌حذفی و آسیایی (فصل ۲ و ۳) ---------- */
  /* بازی واقعی: مخفی، BYE و صعود با استراحت شمرده نمی‌شود */
  function isRealMatch(x) {
    const m = x && x.m ? x.m : x;
    if (!m || m.hidden) return false;
    if (m.a === 'BYE' || m.b === 'BYE') return false;
    if (!m.result || m.result.type === 'bye') return false;
    return true;
  }
  function realMatches(t) { return allMatches(t).filter(isRealMatch); }
  /* بازی‌های قابل نمایش با احترام به «نمایش استراحت» */
  function visibleMatches(t) {
    const lower = (t.settings && t.settings.byeDisplay) === 'lower';
    return allMatches(t).filter(x => {
      if (x.m.hidden) return false;
      if (lower && x.m.result && x.m.result.type === 'bye' && (x.m.round === 0 || x.roundTitle === 'رپشاژ')) return false;
      return true;
    });
  }
  /* شمار بازی‌های واقعی (انجام‌شده / باقی‌مانده) + تعداد استراحت کتابی */
  function statsOverview(t) {
    const real = visibleMatches(t).filter(x => x.m.a !== 'BYE' && x.m.b !== 'BYE' && !(x.m.result && x.m.result.type === 'bye'));
    const done = real.filter(x => x.m.status === 'done' && x.m.result).length;
    const byes = visibleMatches(t).filter(x => x.m.result && x.m.result.type === 'bye').length;
    let goals = 0;
    real.forEach(x => {
      if (x.m.status !== 'done' || !x.m.result || x.m.result.type !== 'score') return;
      const tt = totals(x.m);
      goals += (Number(tt.a) || 0) + (Number(tt.b) || 0);
    });
    return { total: real.length, done, left: Math.max(0, real.length - done), byes, goals, avg: done ? (goals / done) : 0 };
  }
  /* سید عددی تیم بر اساس rank (۱ قوی‌ترین) — نه ترتیب ثبت‌نام */
  function seededSorted(t) {
    return [...(t.teams || [])].sort((a, b) => rankVal(a.rank) - rankVal(b.rank));
  }
  function seedRankOf(t, teamId) {
    if (!teamId || teamId === 'BYE') return null;
    const i = seededSorted(t).findIndex(x => x.id === teamId);
    return i < 0 ? null : i + 1;
  }
  /* بازنده به تفکیک دور حذف (فقط جدول اصلی تک‌حذفی، بدون رده‌بندی/رپشاژ) */
  function exitBuckets(t) {
    const out = {};
    (t.rounds || []).forEach((rd, r) => {
      rd.matches.forEach(m => {
        if (m.hidden || m.id === 'third') return;
        if (m.status !== 'done' || !m.result) return;
        if (m.result.type === 'bye') return;
        const l = m.result.loser;
        if (!l || l === 'BYE') return;
        if (t.champion && l === t.champion) return;
        const parts = (rd.matches.length || 1) * 2;
        (out[r] = out[r] || { round: r, title: rd.title, parts, ids: [] }).ids.push(l);
      });
    });
    return Object.keys(out).map(k => out[k]).sort((a, b) => b.round - a.round);
  }
  /* شگفتی جام: برد سید ضعیف‌تر مقابل سید قوی‌تر */
  function cupUpsets(t) {
    const out = [];
    (t.rounds || []).forEach((rd, r) => {
      rd.matches.forEach(m => {
        if (m.hidden || m.id === 'third') return;
        if (m.status !== 'done' || !m.result || m.result.type !== 'score') return;
        const w = m.result.winner, l = m.result.loser;
        const sw = seedRankOf(t, w), sl = seedRankOf(t, l);
        if (sw == null || sl == null || sw <= sl) return;
        out.push({ round: r, roundTitle: rd.title, winner: w, loser: l, seedW: sw, seedL: sl, m });
      });
    });
    return out.sort((a, b) => (b.seedW - b.seedL) - (a.seedW - a.seedL)).slice(0, 5);
  }
  /* نقشه سقوط آسیایی: هر بازنده جدول جلو در کدام دور باخت و به کدام بازه مقامی رفت */
  function asianDropMap(t) {
    if (!isAsian(t)) return [];
    const ranks = asianRankList(t);
    const titleOf = id => (ranks.find(x => x.id === id) || {}).rank || null;
    const out = [];
    (t.rounds || []).forEach((rd, r) => {
      rd.matches.forEach(m => {
        if (m.hidden) return;
        if (m.status !== 'done' || !m.result) return;
        if (m.result.type === 'bye') return;
        const l = m.result.loser;
        if (!l || l === 'BYE') return;
        const cnt = (rd.matches.length || 1) * 2;
        const lo = Math.min(cnt, (t.teams || []).length);
        const hi = Math.floor(cnt / 2) + 1;
        const band = hi >= lo ? ('مقام ' + faNum(hi)) : ('مقام ' + faNum(hi) + ' تا ' + faNum(lo));
        out.push({ round: r, roundTitle: rd.title, id: l, band, finalRank: titleOf(l) });
      });
    });
    return out.sort((a, b) => a.round - b.round);
  }
  /* تفکیک آسیایی به جدول جلو / پشت جدول */
  function asianFrontBack(t) {
    const front = (t.rounds || []).map(rd => ({ title: rd.title, matches: (rd.matches || []).filter(m => !m.hidden) }));
    const back = ((t.asianRounds || []).filter(rd => rd.kind === 'back'))
      .map(rd => ({ title: rd.title, matches: (rd.matches || []).filter(m => !m.hidden) }));
    const place = ((t.asianRounds || []).filter(rd => rd.kind !== 'back'))
      .map(rd => ({ title: rd.title, matches: (rd.matches || []).filter(m => !m.hidden) }));
    return { front, back, place };
  }

  /* ---------- آمار اختصاصی دوحذفی (فصل ۴) ---------- */
  /* شمار واقعی بازی‌ها به تفکیک W / LB / GF؛ hidden و BYE نادیده گرفته می‌شود */
  function deCount(m) {
    if (!m || m.hidden) return false;
    if (m.a === 'BYE' || m.b === 'BYE') return false;
    if (m.result && m.result.type === 'bye') return false;
    return true;
  }
  function deOverview(t) {
    const wb = (t.rounds || []).reduce((n, rd) => n + rd.matches.filter(deCount).length, 0);
    const wbDone = (t.rounds || []).reduce((n, rd) => n + rd.matches.filter(m => deCount(m) && m.status === 'done' && m.result).length, 0);
    const lb = (t.lbRounds || []).reduce((n, rd) => n + rd.matches.filter(deCount).length, 0);
    const lbDone = (t.lbRounds || []).reduce((n, rd) => n + rd.matches.filter(m => deCount(m) && m.status === 'done' && m.result).length, 0);
    const gfOn = t.gf && deCount(t.gf) ? 1 : 0;
    const gfDone = (t.gf && deCount(t.gf) && t.gf.status === 'done' && t.gf.result) ? 1 : 0;
    const byes = deAllMatches(t).filter(x => !x.m.hidden && x.m.result && x.m.result.type === 'bye').length;
    let goals = 0;
    deAllMatches(t).forEach(x => {
      if (!deCount(x.m) || x.m.status !== 'done' || !x.m.result || x.m.result.type !== 'score') return;
      const tt = totals(x.m);
      goals += (Number(tt.a) || 0) + (Number(tt.b) || 0);
    });
    const done = wbDone + lbDone + gfDone;
    const total = wb + lb + gfOn;
    return { wb, wbDone, lb, lbDone, gf: gfOn, gfDone, total, done, left: Math.max(0, total - done), byes, goals, avg: done ? goals / done : 0 };
  }
  /* رکورد تفکیکی هر تیم: برد/باخت در W و LB و GF + باخت کل */
  function deTeamBoard(t) {
    const rows = t.teams.map(tm => ({
      tm, id: tm.id,
      wW: 0, lW: 0, wL: 0, lL: 0, wG: 0, lG: 0,
      played: 0, won: 0, lost: 0, gf: 0, ga: 0, y: 0, r: 0, fair: 0
    }));
    const byId = {};
    rows.forEach(r => { byId[r.id] = r; });
    for (const { m } of deAllMatches(t)) {
      if (m.hidden || m.status !== 'done' || !m.result || m.result.type === 'bye') continue;
      if (m.a === 'BYE' || m.b === 'BYE') continue;
      const w = m.result.winner, l = m.result.loser;
      const bucket = m.kind === 'gf' ? 'G' : (m.kind === 'lb' ? 'L' : 'W');
      [w, l].forEach(id => {
        if (!id || id === 'BYE' || !byId[id]) return;
        byId[id].played++;
        const tt = totals(m);
        if (id === m.a) { byId[id].gf += tt.a; byId[id].ga += tt.b; }
        else { byId[id].gf += tt.b; byId[id].ga += tt.a; }
        const c = m.cards || {};
        const y = id === m.a ? (c.ya || 0) : (c.yb || 0);
        const rd = id === m.a ? (c.ra || 0) : (c.rb || 0);
        byId[id].y += y; byId[id].r += rd; byId[id].fair += y + 3 * rd;
      });
      if (w && byId[w]) {
        byId[w].won++;
        if (bucket === 'W') byId[w].wW++; else if (bucket === 'L') byId[w].wL++; else byId[w].wG++;
      }
      if (l && byId[l] && l !== 'BYE') {
        byId[l].lost++;
        if (bucket === 'W') byId[l].lW++; else if (bucket === 'L') byId[l].lL++; else byId[l].lG++;
      }
    }
    const losses = deLosses(t);
    rows.forEach(r => { r.losses = losses[r.id] || 0; });
    rows.sort((a, b) => b.won - a.won || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
    return rows;
  }
  /* آیا قهرمان از جدول بازنده‌ها آمده؟ (حداقل یک برد در LB داشته) */
  function deChampFromLosers(t) {
    if (!t.champion || !t.gf || t.gf.status !== 'done' || !t.gf.result) return false;
    for (const { m } of deAllMatches(t)) {
      if (m.kind !== 'lb' || m.hidden || m.status !== 'done' || !m.result || m.result.type === 'bye') continue;
      if (m.result.winner === t.champion) return true;
    }
    return false;
  }
  /* زنجیره بردهای قهرمان در LB تا فینال بزرگ */
  function deLoserRun(t, champId) {
    const id = champId || t.champion;
    if (!id) return [];
    return deAllMatches(t)
      .filter(x => x.m.kind === 'lb' && !x.m.hidden && x.m.status === 'done' && x.m.result && x.m.result.type !== 'bye' && x.m.result.winner === id)
      .sort((a, b) => (a.m.lbLevel || 0) - (b.m.lbLevel || 0) || (a.m.index || 0) - (b.m.index || 0))
      .map(x => ({ roundTitle: x.roundTitle, m: x.m, opp: x.m.result.loser, level: x.m.lbLevel || 0 }));
  }
  /* بازندگان هر سطح LB (برای نمایش محل حذف) — همه بازی‌های سطح */
  function deLbElims(t) {
    const out = {};
    (t.lbRounds || []).forEach((rd, j) => {
      rd.matches.forEach(m => {
        if (m.hidden || m.status !== 'done' || !m.result) return;
        if (m.result.type === 'bye') return;
        const l = m.result.loser;
        if (!l || l === 'BYE' || (t.champion && l === t.champion)) return;
        const slot = (out[j] = out[j] || { level: j, title: rd.title, ids: [] });
        if (!slot.ids.includes(l)) slot.ids.push(l);
      });
    });
    return Object.keys(out).map(k => out[k]).sort((a, b) => b.level - a.level);
  }
  function lossesOf(t, id) {
    const map = (t.losses && typeof t.losses === 'object') ? t.losses : deLosses(t);
    return map[id] || 0;
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

  /* مسیر قهرمان تا جام: بردهای تیم قهرمان به ترتیب مرحله (بدون رپشاژ/رده‌بندی) */
  function championPath(t) {
    if (!t.champion) return [];
    const out = [];
    for (const x of allMatches(t, { skipRep: true })) {
      const m = x.m;
      if (m.id === 'third' || !m.result || m.result.type === 'bye') continue;
      if (m.result.winner !== t.champion) continue;
      out.push({ roundTitle: x.roundTitle, m, opp: m.result.loser });
    }
    return out;
  }

  /* ---------- جدول شانس مجدد / رپشاژ (فصل دوم، مخصوص کشتی و رزمی) ----------
     قاعده کتاب: قرعه‌کشی کامل و تک‌حذفی تا فینال؛ سپس بازندگانِ
     شاخه قهرمان و بازندگانِ شاخه نایب‌قهرمان جداگانه تک‌حذفی می‌شوند و
     برندهٔ هر دسته در یک پل‌آف برای سوم بازی می‌کنند.
     نکته: بازندهٔ فینال (نایب‌قهرمان) در شاخهٔ قهرمان تکرار نمی‌شود. */
  function finalists(t) {
    if (!t.rounds.length || !t.champion) return null;
    const last = t.rounds[t.rounds.length - 1].matches[0];
    if (!last || !last.result) return null;
    return { champion: t.champion, runner: last.result.loser };
  }
  /* بازندگانِ یک فینالیست؛ excludeFinal: فینال نادیده گرفته شود (برای قهرمان) */
  function losersTo(t, finalistId, excludeFinal) {
    const out = [];
    const lastRound = t.rounds.length - 1;
    for (const { m } of allMatches(t)) {
      if (m.id === 'third') continue;
      if (excludeFinal && m.round === lastRound) continue;
      if (m.status !== 'done' || !m.result) continue;
      if (m.result.type === 'bye') continue;
      if (m.result.winner === finalistId && m.result.loser && m.result.loser !== 'BYE') {
        if (!out.includes(m.result.loser)) out.push(m.result.loser);
      }
    }
    return out;
  }
  function buildMiniBracket(ids, prefix) {
    // ids: ترتیب ورود؛ اگر توان ۲ نبود BYE می‌گیرد (مثل جدول اصلی)
    const n = ids.length;
    if (!n) return { rounds: [], winner: null };
    if (n === 1) return { rounds: [], winner: ids[0], single: ids[0] };
    const slots = nextPow2(n);
    const padded = [...ids];
    while (padded.length < slots) padded.push('BYE');
    const rounds = [];
    const nR = Math.log2(slots);
    for (let r = 0; r < nR; r++) {
      const parts = slots / Math.pow(2, r);
      const rd = { title: r === nR - 1 ? 'فینال شانس مجدد' : ('شانس مجدد • مرحله ' + (r + 1)), matches: [] };
      for (let i = 0; i < parts / 2; i++) {
        const m = mkMatch(r, i, null, null);
        m.id = prefix + 'r' + r + 'm' + i;
        if (r === 0) { m.a = padded[i * 2]; m.b = padded[i * 2 + 1]; }
        else { m.pa = prefix + 'r' + (r - 1) + 'm' + (i * 2); m.pb = prefix + 'r' + (r - 1) + 'm' + (i * 2 + 1); }
        rd.matches.push(m);
      }
      rounds.push(rd);
    }
    return { rounds, winner: null };
  }
  function repKey(g) { return g === 'champ' ? 'champBracket' : 'runnerBracket'; }
  function buildRepechage(t) {
    if (isDouble(t)) { alert('جدول دو حذفی خودش فرصت جبران می‌دهد؛ رپشاژ لازم نیست.'); return false; }
    const f = finalists(t);
    if (!f) { alert('اول فینال را برگزار کن تا قهرمان و نایب‌قهرمان مشخص شوند 🏁'); return false; }
    if (!f.runner || f.runner === 'BYE') { alert('نایب‌قهرمان مشخص نیست.'); return false; }
    // شاخه قهرمان: بازندگانِ قهرمان به‌جز نایب‌قهرمانِ فینال
    const cg = losersTo(t, f.champion, true);
    const rg = losersTo(t, f.runner, false);
    if (!cg.length && !rg.length) { alert('بازنده‌ای برای شانس مجدد نیست.'); return false; }
    const champB = buildMiniBracket(cg, 'rpc');
    const runnerB = buildMiniBracket(rg, 'rpr');
    t.repechage = {
      champion: f.champion, runner: f.runner,
      champLosers: cg, runnerLosers: rg,
      champBracket: champB, runnerBracket: runnerB,
      playoff: null, third: [], fourth: null
    };
    // پل‌آف سوم: برندهٔ دسته قهرمان مقابل برندهٔ دسته نایب‌قهرمان
    const po = mkMatch(99, 0, null, null);
    po.id = 'rpplayoff'; po.title = 'پل‌آف سوم';
    t.repechage.playoff = po;
    // صعود خودکار با استراحت در رپشاژ
    ['champ', 'runner'].forEach(g => {
      const br = t.repechage[repKey(g)];
      if (br.rounds.length) br.rounds[0].matches.forEach(m => autoRep(t, g, m));
    });
    refreshRepechageThird(t);
    Store.save();
    return true;
  }
  function findRepMatch(t, g, id) {
    if (t.repechage && t.repechage.playoff && t.repechage.playoff.id === id) return t.repechage.playoff;
    const br = t.repechage && t.repechage[repKey(g)];
    if (!br) return null;
    for (const rd of br.rounds) for (const m of rd.matches) if (m.id === id) return m;
    return null;
  }
  function autoRep(t, g, m) {
    if ((m.a === 'BYE') !== (m.b === 'BYE')) {
      const w = m.a === 'BYE' ? m.b : m.a;
      m.status = 'done';
      m.result = { type: 'bye', winner: w, loser: 'BYE', note: 'صعود با قرعه استراحت (رپشاژ)' };
      propagateRep(t, g, m);
    }
  }
  function propagateRep(t, g, m) {
    const w = matchWinner(t, m);
    if (!w || !t.repechage) return;
    const br = t.repechage[repKey(g)];
    if (m.round === br.rounds.length - 1) {
      br.winner = w;
      refreshRepechageThird(t);
      Store.save();
      return;
    }
    const nx = nextSlot(m.round, m.index);
    const nm = findRepMatch(t, g, g === 'champ' ? 'rpcr' + nx.r + 'm' + nx.m : 'rprr' + nx.r + 'm' + nx.m);
    if (nm) nm[nx.slot] = w;
    Store.save();
  }
  function refreshRepechageThird(t) {
    if (!t.repechage) return;
    const r = t.repechage;
    const cEmpty = !r.champLosers.length;
    const rEmpty = !r.runnerLosers.length;
    const wC = cEmpty ? null : (r.champBracket.winner || r.champBracket.single || null);
    const wR = rEmpty ? null : (r.runnerBracket.winner || r.runnerBracket.single || null);
    const po = r.playoff;
    if (po) {
      if (wC && wR) {
        // هر دو دسته مشخص: پل‌آف سوم برگزار می‌شود
        if (po.status === 'done' && po.result && po.result.type === 'bye') { po.status = 'scheduled'; po.result = null; }
        po.a = wC; po.b = wR;
      } else if (wC && rEmpty) {
        po.a = wC; po.b = 'BYE';
      } else if (wR && cEmpty) {
        po.a = 'BYE'; po.b = wR;
      } else if (wC && !wR) {
        po.a = wC; po.b = null; // منتظر برنده دسته دوم
      } else if (wR && !wC) {
        po.a = null; po.b = wR; // منتظر برنده دسته قهرمان
      } else {
        po.a = null; po.b = null;
      }
      if (po.a && po.b && (po.a === 'BYE') !== (po.b === 'BYE') && po.status !== 'done') {
        const w = po.a === 'BYE' ? po.b : po.a;
        po.status = 'done';
        po.result = { type: 'bye', winner: w, loser: 'BYE', note: 'صعود با استراحت (پل‌آف سوم)' };
      }
      // اگر نتیجهٔ دسته‌ها عوض شد، پل‌آف بی‌اعتبار می‌شود
      if (po.status === 'done' && po.result && po.result.type === 'pick') {
        const okStill = (po.result.winner === wC || po.result.winner === wR)
          && (po.result.loser === wC || po.result.loser === wR);
        if (!okStill) { po.status = 'scheduled'; po.result = null; }
      }
    }
    if (po && po.status === 'done' && po.result) {
      r.third = po.result.winner && po.result.winner !== 'BYE' ? [po.result.winner] : [];
      r.fourth = (po.result.loser && po.result.loser !== 'BYE') ? po.result.loser : null;
    } else {
      // تا وقتی پل‌آف برگزار نشده: برنده هر دسته، سومِ مشترک محسوب می‌شود
      const arr = [];
      if (wC) arr.push(wC);
      if (wR) arr.push(wR);
      r.third = [...new Set(arr)];
      r.fourth = null;
    }
  }
  function setRepechageResult(t, g, matchId, winnerId) {
    const m = findRepMatch(t, g, matchId);
    if (!m) return false;
    if (!m.a || !m.b || m.a === 'BYE' || m.b === 'BYE') { alert('هر دو نفر این بازی مشخص نشده‌اند ⏳'); return false; }
    if (winnerId !== m.a && winnerId !== m.b) return false;
    const loser = winnerId === m.a ? m.b : m.a;
    const isPlayoff = (t.repechage.playoff && t.repechage.playoff.id === m.id);
    // پاک‌سازی اثرات قبلی
    if (m.status === 'done' && m.result) {
      const ow = m.result.winner;
      if (isPlayoff) {
        t.repechage.third = [];
        t.repechage.fourth = null;
      } else {
        const br = t.repechage[repKey(g)];
        if (m.round < br.rounds.length - 1) {
          const nx = nextSlot(m.round, m.index);
          const nm = findRepMatch(t, g, g === 'champ' ? 'rpcr' + nx.r + 'm' + nx.m : 'rprr' + nx.r + 'm' + nx.m);
          if (nm && nm[nx.slot] === ow) {
            if (nm.status === 'done') { nm.status = 'scheduled'; nm.result = null; }
            nm[nx.slot] = null;
          }
        } else br.winner = null;
      }
    }
    m.status = 'done';
    m.result = { type: 'pick', winner: winnerId, loser, note: 'شانس مجدد' };
    if (isPlayoff) refreshRepechageThird(t);
    else propagateRep(t, g, m);
    Store.save();
    return true;
  }
  function clearRepechage(t) { t.repechage = null; Store.save(); }

  /* پیش‌نمایش جفت‌های دور اول بدون تغییر داده (برای دیالوگ چیدمان) */
  function previewPairs(t, method, seededCount) {
    const n = t.teams.length;
    if (n < 2) return [];
    const slots = nextPow2(n);
    const m = normMethod(method || 'lottery');
    const ordered = orderTeams(t, m === 'seeding' || m === 'combined' ? 'seeding' : m);
    const ids = ordered.map(x => x.id);
    let arr;
    if (m === 'seeding') arr = placeTextbook(ids, n, slots);
    else if (m === 'combined') arr = placeCombined(ids, n, slots, seededCount != null ? seededCount : defaultSeeded(n));
    else if (m === 'sequential') arr = placeSequential(ids, n, slots);
    else if (m === 'manual') arr = placeTextbook(ids, n, slots);
    else arr = placeLotteryTextbook(ids, n, slots);
    const out = [];
    for (let i = 0; i + 1 < arr.length; i += 2) {
      out.push({ a: arr[i], b: arr[i + 1], sum: seedOf(t, arr[i]) + seedOf(t, arr[i + 1]) });
    }
    return out;
  }
  /* سید متناظر یک تیم بر اساس rank (۱ قوی‌ترین) */
  function seedOf(t, teamId) { return seedRankOf(t, teamId); }

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
    nextPow2, lowerPow2, baseFor, lowerFor, roundsCount, totalMatches, byeCount,
    firstRoundMatches, firstRoundTeams, pairSum, calcInfo, sharedRankTitle, visibleMatches, repechageMatches,
    seedOrder, textbookOrder, placeTextbook, placeCombined, placeLotteryTextbook, defaultSeeded, normMethod,
    previewPairs, seedOf, seededSorted,
    roundTitle, generateBracket, findMatch, teamName,
    setResult, clearResult, setSchedule, resetBracket, swapTeams,
    allMatches, matchNumber, record, finalRank, fairPoints, totals, displayScore,
    matchWinner, mvpName, mvpStatsLine, tournamentMvp, scorersTable, championPath, todayISO, faDate, faNum,
    isRealMatch, realMatches, statsOverview, seedRankOf, exitBuckets, cupUpsets, asianDropMap, asianFrontBack,
    finalists, losersTo, buildRepechage, setRepechageResult, clearRepechage, findRepMatch, isRepechageMatch,
    buildDouble, isDouble, deAllMatches, deRefresh, deLosses, deCalcInfo, deLbSizes, deSource, deClearDown,
    deOverview, deTeamBoard, deChampFromLosers, deLoserRun, deLbElims,
    buildAsian, isAsian, asianCalcInfo, asianAllMatches, asianFinalRank, asianResolve, asianRankList, asianTotalMatches,
    buildRoundRobin, isRoundRobin, roundCalcInfo, leagueTable, roundFinalRank, roundRefresh, RR_ORDINALS,
    rrOverview, rrForm, rrAttackDefence, rrLeaderByRound,
  };
})();
