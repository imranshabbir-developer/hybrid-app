const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

const isDev = !app.isPackaged;
const DEV_WEB_URL = process.env.ERP_WEB_URL || 'http://127.0.0.1:5173';
const API_PORT = Number(process.env.API_PORT || 3001);
const API_URL = `http://127.0.0.1:${API_PORT}`;

let apiProcess = null;

function dataDir() {
  const dir = process.env.ERP_DATA_DIR || path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function waitForHealth(timeoutMs = 25000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`${API_URL}/api/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) resolve(true);
        else if (Date.now() - started > timeoutMs) reject(new Error('API health timeout'));
        else setTimeout(tick, 400);
      });
      req.on('error', () => {
        if (Date.now() - started > timeoutMs) reject(new Error('API not reachable'));
        else setTimeout(tick, 400);
      });
    };
    tick();
  });
}

function startBundledApi() {
  const resources = process.resourcesPath;
  const apiEntry = path.join(resources, 'api', 'dist', 'main.js');
  if (!fs.existsSync(apiEntry)) {
    console.warn('[desktop] Bundled API not found at', apiEntry);
    return null;
  }

  const webDist = path.join(resources, 'web');
  apiProcess = spawn(process.execPath, [apiEntry], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      DB_ENGINE: 'sqlite',
      ERP_DATA_DIR: dataDir(),
      ERP_WEB_DIST: webDist,
      API_PORT: String(API_PORT),
      NODE_ENV: 'production',
    },
    stdio: 'inherit',
  });

  apiProcess.on('exit', (code) => {
    console.log('[desktop] API exited', code);
    apiProcess = null;
  });

  return apiProcess;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 390,
    minHeight: 640,
    backgroundColor: '#f4f6f9',
    title: 'Nexus ERP',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    await win.loadURL(DEV_WEB_URL);
  } else {
    await win.loadURL(`${API_URL}/`);
  }

  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    shell.openExternal(openUrl);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  if (!isDev) {
    startBundledApi();
    try {
      await waitForHealth();
    } catch (err) {
      console.error('[desktop] API failed to start', err);
    }
  }

  await createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (apiProcess) {
    apiProcess.kill();
    apiProcess = null;
  }
  if (process.platform !== 'darwin') app.quit();
});
