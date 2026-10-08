/* لایه داده: ذخیره‌سازی لوکال، کاملا آفلاین */
const Store = (() => {
  const KEY = 'takhazfi_db_v1';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function blank() {
    return { tournaments: [], activeId: null, theme: 'dark' };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const db = JSON.parse(raw);
      if (!db || !Array.isArray(db.tournaments)) return blank();
      return Object.assign(blank(), db);
    } catch (e) { return blank(); }
  }

  let db = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
  }

  const TEAM_COLORS = ['#16a34a','#2563eb','#dc2626','#9333ea','#ea580c','#0891b2','#4f46e5','#be123c','#65a30d','#0d9488'];

  function active() {
    return db.tournaments.find(t => t.id === db.activeId) || null;
  }
  function setActive(id) { db.activeId = id; save(); }

  const SCORING_BY_SPORT = { football: 'goals', futsal: 'goals', volleyball: 'sets', tennis: 'sets', basketball: 'points', wrestling: 'points', custom: 'goals' };

  function createTournament(data) {
    const sport = data.sport || 'football';
    const t = {
      id: uid(),
      name: (data.name || 'تورنمنت جدید').trim(),
      sport,
      targetSize: parseInt(data.targetSize || '8', 10),
      startDate: data.startDate || '', endDate: data.endDate || '',
      place: data.place || '', desc: data.desc || '',
      color: (/^#[0-9a-fA-F]{6}$/.test(data.color || '') ? data.color : null),
      status: 'setup',
      settings: {
        thirdPlace: data.thirdPlace !== false,
        scoring: data.scoring || SCORING_BY_SPORT[sport] || 'goals',
        series: parseInt(data.series || '1', 10) || 1,
        byeTo: data.byeTo || 'top'
      },
      teams: [], rounds: [], thirdPlace: null, champion: null,
      createdAt: Date.now(), updatedAt: Date.now()
    };
    db.tournaments.push(t);
    db.activeId = t.id;
    save();
    return t;
  }

  function updateTournament(id, patch) {
    const t = db.tournaments.find(x => x.id === id);
    if (!t) return null;
    Object.assign(t, patch);
    t.updatedAt = Date.now();
    save();
    return t;
  }

  function deleteTournament(id) {
    db.tournaments = db.tournaments.filter(x => x.id !== id);
    if (db.activeId === id) db.activeId = db.tournaments.length ? db.tournaments[0].id : null;
    save();
  }

  function duplicateTournament(id) {
    const src = db.tournaments.find(x => x.id === id);
    if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = uid();
    copy.name = src.name + ' (کپی)';
    copy.status = src.status;
    copy.createdAt = Date.now(); copy.updatedAt = Date.now();
    db.tournaments.push(copy);
    db.activeId = copy.id;
    save();
    return copy;
  }

  function addTeam(tid, data) {
    const t = db.tournaments.find(x => x.id === tid);
    if (!t) return null;
    if (t.teams.length >= 64) { alert('حداکثر ۶۴ تیم مجاز است.'); return null; }
    const name = (data.name || '').trim();
    if (!name) { alert('نام تیم الزامی است.'); return null; }
    if (t.teams.some(x => x.name === name)) { alert('این نام تکراری است.'); return null; }
    const team = {
      id: uid(), name,
      short: name.slice(0, 2),
      coach: data.coach || '', phone: data.phone || '',
      rank: parseInt(data.rank || '0', 10) || 0,
      color: data.color || TEAM_COLORS[t.teams.length % TEAM_COLORS.length],
      photo: data.photo || null
    };
    t.teams.push(team);
    t.updatedAt = Date.now();
    save();
    return team;
  }

  function updateTeam(tid, teamId, patch) {
    const t = db.tournaments.find(x => x.id === tid);
    if (!t) return;
    const tm = t.teams.find(x => x.id === teamId);
    if (!tm) return;
    if (patch.name && t.teams.some(x => x.id !== teamId && x.name === patch.name.trim())) {
      alert('این نام تکراری است.'); return;
    }
    Object.assign(tm, patch);
    t.updatedAt = Date.now();
    save();
  }

  function removeTeam(tid, teamId) {
    const t = db.tournaments.find(x => x.id === tid);
    if (!t) return;
    if (t.rounds && t.rounds.length) {
      if (!confirm('جدول قرعه‌کشی شده است. با حذف تیم، جدول ریست می‌شود. ادامه؟')) return;
      t.rounds = []; t.thirdPlace = null; t.champion = null; t.status = 'setup';
    }
    t.teams = t.teams.filter(x => x.id !== teamId);
    t.updatedAt = Date.now();
    save();
  }

  function exportJSON() { return JSON.stringify(db); }
  function importJSON(text) {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.tournaments)) throw new Error('فایل معتبر نیست');
    db = Object.assign(blank(), data);
    save();
  }

  return {
    get db() { return db; },
    uid, save, active, setActive,
    createTournament, updateTournament, deleteTournament, duplicateTournament,
    addTeam, updateTeam, removeTeam,
    exportJSON, importJSON, TEAM_COLORS
  };
})();
