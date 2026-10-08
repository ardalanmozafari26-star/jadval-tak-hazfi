/* راه‌اندازی */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    UI.applyTheme();
    document.querySelectorAll('#tabbar button').forEach(b =>
      b.addEventListener('click', () => UI.switchView(b.dataset.view)));
    document.getElementById('menuBtn').addEventListener('click', UI.openDrawer);
    document.getElementById('drawerClose').addEventListener('click', UI.closeDrawer);
    document.getElementById('drawerOverlay').addEventListener('click', UI.closeDrawer);
    const mk = () => UI.openTournamentDialog();
    document.getElementById('newTournamentBtn').addEventListener('click', mk);
    document.getElementById('drawerNew').addEventListener('click', () => { UI.closeDrawer(); mk(); });
    document.getElementById('modalOverlay').addEventListener('click', e => {
      if (e.target.id === 'modalOverlay') UI.closeModal();
    });
    UI.render();
    setTimeout(() => document.getElementById('splash').classList.add('hide'), 900);
  });
})();
