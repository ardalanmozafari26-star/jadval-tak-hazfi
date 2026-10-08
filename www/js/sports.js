/* متای رشته‌های ورزشی: statهای بهترین بازیکن هر رشته
   قرارداد سید: عدد کوچک‌تر = قوی‌تر (۱ قوی‌ترین) */
const SPORTS_META = {
  football: {
    name: 'فوتبال',
    mvpStats: [
      { key: 'goals', label: 'گل' },
      { key: 'assists', label: 'پاس گل' },
      { key: 'cs', label: 'کلین‌شیت', type: 'check' }
    ],
    primary: 'goals'
  },
  futsal: {
    name: 'فوتسال',
    mvpStats: [
      { key: 'goals', label: 'گل' },
      { key: 'assists', label: 'پاس گل' }
    ],
    primary: 'goals'
  },
  volleyball: {
    name: 'والیبال',
    mvpStats: [
      { key: 'points', label: 'امتیاز' },
      { key: 'blocks', label: 'دفاع' },
      { key: 'aces', label: 'سرویس مستقیم' }
    ],
    primary: 'points'
  },
  basketball: {
    name: 'بسکتبال',
    mvpStats: [
      { key: 'points', label: 'امتیاز' },
      { key: 'reb', label: 'ریباند' },
      { key: 'ast', label: 'پاس گل' }
    ],
    primary: 'points'
  },
  tennis: {
    name: 'تنیس',
    mvpStats: [
      { key: 'aces', label: 'ایس' },
      { key: 'winners', label: 'وینر' }
    ],
    primary: 'aces'
  },
  wrestling: {
    name: 'کشتی',
    mvpStats: [
      { key: 'tech', label: 'امتیاز فنی' },
      { key: 'fall', label: 'ضربه فنی', type: 'check' }
    ],
    primary: 'tech'
  },
  custom: {
    name: 'آزاد',
    mvpStats: [{ key: 'score', label: 'امتیاز' }],
    primary: 'score'
  }
};
/* مقدار سید برای مرتب‌سازی: ۱ قوی‌ترین؛ خالی/صفر = بدون سید (آخر) */
function rankVal(r) {
  const n = parseInt(r, 10);
  return (isNaN(n) || n < 1) ? 9999 : n;
}
