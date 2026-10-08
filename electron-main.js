/* نسخه دسکتاپ ویندوز - جدول تک حذفی */
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 860,
    minWidth: 360,
    minHeight: 600,
    title: 'جدول تک حذفی',
    backgroundColor: '#0a0f1e',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'www', 'index.html'));
  // لینک‌های خارجی (mailto و...) در مرورگر پیش‌فرض باز شوند
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('mailto:')) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('mailto:')) { e.preventDefault(); shell.openExternal(url); }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
