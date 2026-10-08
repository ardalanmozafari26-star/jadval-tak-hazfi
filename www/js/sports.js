/* متای رشته‌های ورزشی: statهای بهترین بازیکن هر رشته
   قرارداد سید: عدد کوچک‌تر = قوی‌تر (۱ قوی‌ترین) */
const SPORTS_META = {
  football: {
    name: 'فوتبال', color: '#16a34a',
    mvpStats: [
      { key: 'goals', label: 'گل' },
      { key: 'assists', label: 'پاس گل' },
      { key: 'cs', label: 'کلین‌شیت', type: 'check' }
    ],
    primary: 'goals'
  },
  futsal: {
    name: 'فوتسال', color: '#0d9488',
    mvpStats: [
      { key: 'goals', label: 'گل' },
      { key: 'assists', label: 'پاس گل' }
    ],
    primary: 'goals'
  },
  volleyball: {
    name: 'والیبال', color: '#2563eb',
    mvpStats: [
      { key: 'points', label: 'امتیاز' },
      { key: 'blocks', label: 'دفاع' },
      { key: 'aces', label: 'سرویس مستقیم' }
    ],
    primary: 'points'
  },
  basketball: {
    name: 'بسکتبال', color: '#ea580c',
    mvpStats: [
      { key: 'points', label: 'امتیاز' },
      { key: 'reb', label: 'ریباند' },
      { key: 'ast', label: 'پاس گل' }
    ],
    primary: 'points'
  },
  tennis: {
    name: 'تنیس', color: '#65a30d',
    mvpStats: [
      { key: 'aces', label: 'ایس' },
      { key: 'winners', label: 'وینر' }
    ],
    primary: 'aces'
  },
  wrestling: {
    name: 'کشتی', color: '#dc2626',
    mvpStats: [
      { key: 'tech', label: 'امتیاز فنی' },
      { key: 'fall', label: 'ضربه فنی', type: 'check' }
    ],
    primary: 'tech'
  },
  custom: {
    name: 'آزاد', color: '#9333ea',
    mvpStats: [{ key: 'score', label: 'امتیاز' }],
    primary: 'score'
  }
};
/* پالت پیشنهادی رنگ برند */
const SPORT_PALETTE = ['#16a34a', '#0d9488', '#2563eb', '#9333ea', '#dc2626', '#ea580c', '#eab308'];
/* رنگ برند تورنمنت: انتخاب کاربر، وگرنه رنگ رشته */
function brandColorOf(t) {
  if (t && /^#[0-9a-fA-F]{6}$/.test(t.color || '')) return t.color;
  const m = (t && SPORTS_META[t.sport]) || SPORTS_META.custom;
  return (m && m.color) || '#16a34a';
}
/* افزودن آلفا به رنگ hex: hexA('#16a34a', .14) -> '#16a34a24' */
function hexA(hex, a) {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex || '');
  if (!m) return 'rgba(22,163,74,.14)';
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
  return '#' + m[1] + v;
}
/* تیره‌تر کردن رنگ hex به نسبت amt (۰ تا ۱) */
function shade(hex, amt) {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex || '');
  if (!m) return '#15803d';
  const n = parseInt(m[1], 16), f = 1 - Math.max(0, Math.min(1, amt));
  const c = v => Math.round(Math.max(0, Math.min(255, v * f)));
  return '#' + [c(n >> 16), c((n >> 8) & 255), c(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
}
/* مقدار سید برای مرتب‌سازی: ۱ قوی‌ترین؛ خالی/صفر = بدون سید (آخر) */
function rankVal(r) {
  const n = parseInt(r, 10);
  return (isNaN(n) || n < 1) ? 9999 : n;
}
