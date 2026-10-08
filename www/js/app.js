/* راه‌اندازی */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    UI.applyTheme();
    UI.applyPerfFlags();
    document.querySelectorAll('#tabbar button').forEach(b =>
      b.addEventListener('click', () => UI.switchView(b.dataset.view)));
    document.getElementById('menuBtn').addEventListener('click', UI.openDrawer);
    document.getElementById('drawerClose').addEventListener('click', UI.closeDrawer);
    document.getElementById('drawerOverlay').addEventListener('click', UI.closeDrawer);
    const mk = () => UI.openTournamentDialog();
    document.getElementById('drawerNew').addEventListener('click', () => { UI.closeDrawer(); mk(); });
    document.getElementById('modalOverlay').addEventListener('click', e => {
      if (e.target.id === 'modalOverlay') UI.closeModal();
    });
    UI.initGestures();
    UI.render();
    UI.updateFab();
    requestAnimationFrame(() => UI.moveTabInd());
    setTimeout(() => document.getElementById('splash').classList.add('hide'), 900);
  });
})();
