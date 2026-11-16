/* ============================================================
   تقویم هجری شمسی — تبدیل تاریخ، برچسب فارسی و تقویم انتخاب تاریخ
   کاملاً آفلاین و مستقل از داده‌های ICU مرورگر
   قرارداد ذخیره‌سازی: تاریخ‌ها به‌صورت ISO میلادی (YYYY-MM-DD) ذخیره
   و همه‌جا به شمسی نمایش داده می‌شوند.
   ============================================================ */
const Jalali = (() => {
  const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const WEEK = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];            // شنبه تا جمعه
  const WEEK_FULL = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  /* ---- ابزار عددی ---- */
  const div = (a, b) => ~~(a / b);
  const mod = (a, b) => a - ~~(a / b) * b;
  function fa(s) { return String(s == null ? '' : s).replace(/[0-9]/g, d => FA_DIGITS[+d]); }
  function en(s) { return String(s == null ? '' : s).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0)); }

  /* ---- تبدیل میلادی/شمسی بر پایهٔ شمارهٔ روز ژولین (روش جلالی) ---- */
  function g2d(gy, gm, gd) {
    let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }
  function d2g(jdn) {
    let j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    const i = div(mod(j, 1461), 4) * 5 + 308;
    const gd = div(mod(i, 153), 5) + 1;
    const gm = mod(div(i, 153), 12) + 1;
    const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return [gy, gm, gd];
  }
  function jalCal(jy) {
    const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
    const bl = breaks.length;
    const gy = jy + 621;
    let leapJ = -14, jp = breaks[0], jump = 0, leap, leapG, march, n, jm;
    if (jy < jp || jy >= breaks[bl - 1]) return null;
    for (let i = 1; i < bl; i++) {
      jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    march = 20 + leapJ - leapG;
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return { leap: leap, gy: gy, march: march };
  }
  function j2d(jy, jm, jd) {
    const r = jalCal(jy);
    if (!r) return null;
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }
  function d2j(jdn) {
    const gy = d2g(jdn)[0];
    let jy = gy - 621;
    const r = jalCal(jy);
    if (!r) return null;
    const jdn1f = g2d(gy, 3, r.march);
    let k = jdn - jdn1f, jm, jd;
    if (k >= 0) {
      if (k <= 185) { jm = 1 + div(k, 31); jd = mod(k, 31) + 1; return [jy, jm, jd]; }
      k -= 186;
    } else {
      jy -= 1; k += 179;
      if (r.leap === 1) k += 1;
    }
    jm = 7 + div(k, 30);
    jd = mod(k, 30) + 1;
    return [jy, jm, jd];
  }
  function isLeap(jy) { const r = jalCal(jy); return !!r && r.leap === 0; }
  function monthLen(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isLeap(jy) ? 30 : 29;
  }

  /* ---- API عمومی تبدیل ---- */
  function toJalali(iso) {
    if (!iso) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
    if (!m) return null;
    const jdn = g2d(+m[1], +m[2], +m[3]);
    const j = d2j(jdn);
    return j ? [j[0], j[1], j[2]] : null;
  }
  function fromJalali(jy, jm, jd) {
    const jdn = j2d(jy, jm, jd);
    if (jdn == null) return '';
    const g = d2g(jdn);
    return g[0] + '-' + String(g[1]).padStart(2, '0') + '-' + String(g[2]).padStart(2, '0');
  }
  function todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function todayJalali() { return toJalali(todayISO()); }
  /* ۰ = شنبه */
  function weekdayIndex(iso) {
    if (!iso) return 0;
    const d = new Date(String(iso) + 'T00:00:00');
    if (isNaN(d.getTime())) return 0;
    return (d.getDay() + 1) % 7;
  }
  /* برچسب کامل: «سه‌شنبه ۲۵ آبان ۱۴۰۵» */
  function label(iso, withWeekday) {
    const j = toJalali(iso);
    if (!j) return iso || '—';
    const core = fa(j[2]) + ' ' + MONTHS[j[1] - 1] + ' ' + fa(j[0]);
    return withWeekday ? WEEK_FULL[weekdayIndex(iso)] + ' ' + core : core;
  }
  /* برچسب عددی: «۱۴۰۵/۰۸/۲۵» */
  function short(iso) {
    const j = toJalali(iso);
    if (!j) return '';
    return fa(j[0]) + '/' + fa(String(j[1]).padStart(2, '0')) + '/' + fa(String(j[2]).padStart(2, '0'));
  }

  /* ============================================================
     انتخابگر تاریخ شمسی (popup سبک داخل هر فرم)
     ============================================================ */
  let pop = null, state = null;

  function ensurePop() {
    if (pop) return pop;
    pop = document.createElement('div');
    pop.id = 'jdatePop';
    pop.className = 'jdate-pop hidden';
    document.body.appendChild(pop);
    document.addEventListener('mousedown', e => {
      if (!pop || pop.classList.contains('hidden')) return;
      if (pop.contains(e.target)) return;
      if (e.target.closest && e.target.closest('.jdate-btn')) return;
      close();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    return pop;
  }
  function close() {
    if (pop) pop.classList.add('hidden');
    state = null;
  }
  function open(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    // فیلد را در دید بیاور تا تقویم در همان محدوده باز شود
    try { input.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (e) { try { input.scrollIntoView(); } catch (e2) {} }
    const p = ensurePop();
    const iso = input.getAttribute('data-iso') || '';
    const j = toJalali(iso) || todayJalali();
    state = { id: fieldId, jy: j[0], jm: j[1] };
    render();
    p.classList.remove('hidden');
    place(input);
  }
  function place(input) {
    if (!pop) return;
    const r = input.getBoundingClientRect();
    const w = pop.offsetWidth || 288, h = pop.offsetHeight || 300;
    let top = r.bottom + 8;
    if (top + h > innerHeight - 12) {
      const above = r.top - h - 8;
      top = (above >= 12) ? above : Math.max(12, innerHeight - h - 12);
    }
    if (top < 12) top = 12;
    let left = r.right - w;
    if (left < 12) left = 12;
    if (left + w > innerWidth - 12) left = Math.max(12, innerWidth - w - 12);
    pop.style.top = Math.round(top) + 'px';
    pop.style.left = Math.round(left) + 'px';
  }
  function render() {
    if (!state || !pop) return;
    const { jy, jm } = state;
    const first = fromJalali(jy, jm, 1);
    const offset = weekdayIndex(first);
    const len = monthLen(jy, jm);
    const today = todayISO();
    const sel = (document.getElementById(state.id) || {}).getAttribute
      ? (document.getElementById(state.id).getAttribute('data-iso') || '') : '';
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push('<span class="jd-cell empty"></span>');
    for (let d = 1; d <= len; d++) {
      const iso = fromJalali(jy, jm, d);
      const cls = 'jd-cell' + (iso === today ? ' today' : '') + (iso === sel ? ' sel' : '');
      cells.push('<button type="button" class="' + cls + '" onclick="Jalali.pick(' + d + ')">' + fa(d) + '</button>');
    }
    pop.innerHTML =
      '<div class="jd-head">' +
      '<button type="button" class="jd-nav" onclick="Jalali.shift(-1)" aria-label="ماه قبل">‹</button>' +
      '<div class="jd-title">' + MONTHS[jm - 1] + ' ' + fa(jy) + '</div>' +
      '<button type="button" class="jd-nav" onclick="Jalali.shift(1)" aria-label="ماه بعد">›</button>' +
      '</div>' +
      '<div class="jd-week">' + WEEK.map(w => '<span>' + w + '</span>').join('') + '</div>' +
      '<div class="jd-grid">' + cells.join('') + '</div>' +
      '<div class="jd-foot">' +
      '<button type="button" class="action small" onclick="Jalali.today()">امروز</button>' +
      '<button type="button" class="action small" onclick="Jalali.clear()">پاک کردن</button>' +
      '</div>';
  }
  function shift(dir) {
    if (!state) return;
    let jm = state.jm + dir, jy = state.jy;
    if (jm < 1) { jm = 12; jy--; }
    if (jm > 12) { jm = 1; jy++; }
    state.jm = jm; state.jy = jy;
    render();
  }
  function pick(day) {
    if (!state) return;
    const iso = fromJalali(state.jy, state.jm, day);
    set(state.id, iso);
    close();
  }
  function today() {
    if (!state) return;
    set(state.id, todayISO());
    close();
  }
  function clear() {
    if (!state) return;
    set(state.id, '');
    close();
  }
  /* ثبت مقدار (ISO) روی فیلد و نمایش شمسی */
  function set(fieldId, iso) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    input.setAttribute('data-iso', iso || '');
    input.value = iso ? label(iso) : '';
    try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
  }
  function read(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return '';
    return input.getAttribute('data-iso') || '';
  }
  /* فیلد آمادهٔ استفاده در فرم‌ها */
  function field(id, iso, placeholder) {
    const val = iso ? label(iso) : '';
    return '<div class="jdate">' +
      '<input type="text" id="' + id + '" class="field jdate-inp" readonly autocomplete="off" ' +
      'placeholder="' + (placeholder || 'انتخاب تاریخ شمسی') + '" value="' + val + '"' +
      (iso ? ' data-iso="' + iso + '"' : '') + '>' +
      '<button type="button" class="jdate-btn" onclick="Jalali.open(\'' + id + '\')" aria-label="انتخاب تاریخ شمسی">📅</button>' +
      '</div>';
  }

  return {
    MONTHS, WEEK, WEEK_FULL, fa, en,
    toJalali, fromJalali, todayISO, todayJalali, weekdayIndex, label, short,
    isLeap, monthLen, field, read, set, open, close, pick, shift, today, clear
  };
})();
